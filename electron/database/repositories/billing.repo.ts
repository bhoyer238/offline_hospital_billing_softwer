import { getDatabase } from '../db';

export interface BillItem {
  id?: number;
  bill_id?: number;
  service_id: number | null;
  service_name: string;
  quantity: number;
  rate: number;
  amount: number;
  notes: string | null;
  sort_order: number;
}

export interface Bill {
  id: number;
  bill_number: string;
  bill_type: 'IPD' | 'OPD';
  bill_date: string;
  bill_time: string;
  patient_id: number;
  ipd_id: number | null;
  opd_id: number | null;
  doctor_id: number | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'Draft' | 'Finalized' | 'Cancelled';
  cancelled_by: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  // Joined
  patient_name?: string;
  uhid?: string;
  mobile?: string;
  age?: number;
  age_unit?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
  doctor_name?: string;
  ipd_number?: string;
  opd_number?: string;
  admission_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  tpa_name?: string;
  claim_number?: string;
  policy_name?: string;
  category?: string;
  items?: BillItem[];
}

export interface Payment {
  id: number;
  receipt_number: string;
  bill_id: number;
  patient_id: number;
  amount: number;
  payment_mode: string;
  payment_date: string;
  payment_time: string;
  cheque_number: string | null;
  bank_name: string | null;
  transaction_id: string | null;
  notes: string | null;
  received_by: number | null;
  created_at: string;
  receiver_name?: string;
}


function generateReceiptNumber(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();

  const tx = db.transaction(() => {
    const seq = db.prepare('SELECT last_number FROM receipt_sequence WHERE year = ?').get(year) as { last_number: number } | undefined;
    let nextNum: number;
    if (seq) {
      nextNum = seq.last_number + 1;
      db.prepare('UPDATE receipt_sequence SET last_number = ? WHERE year = ?').run(nextNum, year);
    } else {
      nextNum = 1;
      db.prepare('INSERT INTO receipt_sequence (year, last_number) VALUES (?, ?)').run(year, nextNum);
    }
    return nextNum;
  });

  const num = tx();
  const settings = db.prepare('SELECT receipt_prefix FROM hospital_settings WHERE id = 1').get() as { receipt_prefix: string };
  const prefix = settings?.receipt_prefix || 'RCPT';
  return `${prefix}/${year}/${String(num).padStart(6, '0')}`;
}

export function createBill(data: {
  bill_type: 'IPD' | 'OPD';
  patient_id: number;
  ipd_id?: number;
  opd_id?: number;
  doctor_id?: number;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  net_amount: number;
  items: Omit<BillItem, 'id' | 'bill_id'>[];
  notes?: string;
  created_by?: number;
}): { success: boolean; bill?: Bill; error?: string } {
  const db = getDatabase();

  try {
    let createdBill: Bill | null = null;

    // Single atomic transaction: sequence increment + bill insert + items insert
    const tx = db.transaction(() => {
      // ── Generate bill number INSIDE transaction for atomicity ──
      const now = new Date();
      const year = now.getFullYear();
      const billDate = now.toISOString().split('T')[0];
      const billTime = now.toTimeString().slice(0, 8);

      const settings = db.prepare(
        'SELECT bill_prefix FROM hospital_settings WHERE id = 1'
      ).get() as { bill_prefix: string } | undefined;
      const prefix = settings?.bill_prefix || 'IPDR';

      // Use a SINGLE shared sequence per year (bill_type = 'ALL') so that IPD
      // and OPD bills never get the same number when they share the same prefix.
      const SHARED_TYPE = 'ALL';

      // Also read actual max sequence number from bills table in case sequence
      // table is out of sync (e.g. after import or sequence reset).
      const seqRow = db.prepare(
        'SELECT last_number FROM bill_sequences WHERE year = ? AND bill_type = ?'
      ).get(year, SHARED_TYPE) as { last_number: number } | undefined;

      const actualMaxRow = db.prepare(
        "SELECT MAX(CAST(SUBSTR(bill_number, LENGTH(bill_number) - 3) AS INTEGER)) AS max_num FROM bills WHERE bill_number LIKE ?"
      ).get(`${prefix}/${year}/${year + 1}/%`) as { max_num: number | null };

      const seqNum = seqRow?.last_number ?? 0;
      const actualMax = actualMaxRow?.max_num ?? 0;
      const nextNum = Math.max(seqNum, actualMax) + 1;

      // Update or insert sequence
      if (seqRow) {
        db.prepare(
          'UPDATE bill_sequences SET last_number = ? WHERE year = ? AND bill_type = ?'
        ).run(nextNum, year, SHARED_TYPE);
      } else {
        db.prepare(
          'INSERT OR IGNORE INTO bill_sequences (year, bill_type, last_number) VALUES (?, ?, ?)'
        ).run(year, SHARED_TYPE, nextNum);
        // If INSERT was ignored (row already existed), update
        db.prepare(
          'UPDATE bill_sequences SET last_number = MAX(last_number, ?) WHERE year = ? AND bill_type = ?'
        ).run(nextNum, year, SHARED_TYPE);
      }

      const billNumber = `${prefix}/${year}/${year + 1}/${String(nextNum).padStart(4, '0')}`;

      // ── Insert bill ──
      const result = db.prepare(`
        INSERT INTO bills (
          bill_number, bill_type, bill_date, bill_time, patient_id, ipd_id, opd_id, doctor_id,
          subtotal, discount_amount, discount_percent, tax_amount, net_amount,
          paid_amount, balance_amount, status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Finalized', ?, ?)
      `).run(
        billNumber, data.bill_type, billDate, billTime,
        data.patient_id, data.ipd_id ?? null, data.opd_id ?? null, data.doctor_id ?? null,
        data.subtotal, data.discount_amount, data.discount_percent, data.tax_amount, data.net_amount,
        data.net_amount, data.notes ?? null, data.created_by ?? null
      );

      const billId = result.lastInsertRowid as number;

      // ── Insert bill items ──
      const insertItem = db.prepare(`
        INSERT INTO bill_items (bill_id, service_id, service_name, quantity, rate, amount, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.items.forEach((item, idx) => {
        insertItem.run(billId, item.service_id, item.service_name, item.quantity, item.rate, item.amount, item.notes ?? null, idx);
      });

      createdBill = getBill(billId);
    });

    tx();
    return { success: true, bill: createdBill! };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create bill';
    if (msg.includes('UNIQUE constraint failed') && msg.includes('bill_number')) {
      return { success: false, error: 'Bill number conflict — please try again.' };
    }
    if (msg.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Duplicate record detected. Please check and try again.' };
    }
    return { success: false, error: msg };
  }
}

export function updateBill(id: number, data: {
  doctor_id?: number | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  net_amount: number;
  balance_amount: number;
  items: Omit<BillItem, 'id' | 'bill_id'>[];
  notes?: string;
  updated_by?: number;
}): { success: boolean; bill?: Bill; error?: string } {
  const db = getDatabase();
  try {
    const existing = db.prepare('SELECT id, status, paid_amount FROM bills WHERE id = ?').get(id) as { id: number; status: string; paid_amount: number } | undefined;
    if (!existing) return { success: false, error: 'Bill not found' };
    if (existing.status === 'Cancelled') return { success: false, error: 'Cannot edit a cancelled bill' };

    // Balance = net_amount - paid_amount
    const balanceAmount = data.net_amount - existing.paid_amount;

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE bills SET
          doctor_id = ?, subtotal = ?, discount_amount = ?, discount_percent = ?,
          tax_amount = ?, net_amount = ?, balance_amount = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        data.doctor_id ?? null,
        data.subtotal, data.discount_amount, data.discount_percent,
        data.tax_amount, data.net_amount, balanceAmount,
        data.notes ?? null, id
      );

      // Replace all items
      db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(id);
      const insertItem = db.prepare(`
        INSERT INTO bill_items (bill_id, service_id, service_name, quantity, rate, amount, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.items.forEach((item, idx) => {
        insertItem.run(id, item.service_id, item.service_name, item.quantity, item.rate, item.amount, item.notes ?? null, idx);
      });
    });

    tx();
    return { success: true, bill: getBill(id) ?? undefined };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to update bill' };
  }
}

export function getBill(id: number): Bill | null {
  const db = getDatabase();

  const bill = db.prepare(`
    SELECT b.*,
           p.patient_name, p.uhid, p.mobile, p.age, p.age_unit, p.gender,
           p.address, p.city, p.district,
           d.doctor_name,
           i.ipd_number, i.admission_date, i.discharge_date, i.diagnosis,
           i.tpa_name, i.claim_number, i.policy_name, i.category,
           o.opd_number
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    LEFT JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN ipd_admissions i ON b.ipd_id = i.id
    LEFT JOIN opd_visits o ON b.opd_id = o.id
    WHERE b.id = ?
  `).get(id) as Bill | null;

  if (bill) {
    bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY sort_order').all(id) as BillItem[];
  }

  return bill;
}

export function getBillByNumber(billNumber: string): Bill | null {
  const db = getDatabase();
  const bill = db.prepare(`
    SELECT b.*,
           p.patient_name, p.uhid, p.mobile, p.age, p.age_unit, p.gender,
           p.address, p.city, p.district,
           d.doctor_name,
           i.ipd_number, i.admission_date, i.discharge_date, i.diagnosis,
           i.tpa_name, i.claim_number, i.policy_name, i.category,
           o.opd_number
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    LEFT JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN ipd_admissions i ON b.ipd_id = i.id
    LEFT JOIN opd_visits o ON b.opd_id = o.id
    WHERE b.bill_number = ?
  `).get(billNumber) as Bill | null;

  if (bill) {
    bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY sort_order').all(bill.id) as BillItem[];
  }
  return bill;
}

export function searchBills(query: string, filters: { dateFrom?: string; dateTo?: string; status?: string; billType?: string }, limit = 50, offset = 0): { bills: Bill[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query) {
    conditions.push('(b.bill_number LIKE ? OR p.patient_name LIKE ? OR p.uhid LIKE ? OR p.mobile LIKE ? OR i.ipd_number LIKE ?)');
    const s = `%${query}%`;
    params.push(s, s, s, s, s);
  }
  if (filters.dateFrom) { conditions.push('b.bill_date >= ?'); params.push(filters.dateFrom); }
  if (filters.dateTo) { conditions.push('b.bill_date <= ?'); params.push(filters.dateTo); }
  if (filters.status) { conditions.push('b.status = ?'); params.push(filters.status); }
  if (filters.billType) { conditions.push('b.bill_type = ?'); params.push(filters.billType); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const baseQuery = `
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    LEFT JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN ipd_admissions i ON b.ipd_id = i.id
    LEFT JOIN opd_visits o ON b.opd_id = o.id
    ${where}
  `;

  const total = (db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as { count: number }).count;
  const bills = db.prepare(`
    SELECT b.*, p.patient_name, p.uhid, p.mobile, d.doctor_name,
           i.ipd_number, o.opd_number
    ${baseQuery}
    ORDER BY b.bill_date DESC, b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Bill[];

  return { bills, total };
}

export function cancelBill(billId: number, reason: string, cancelledBy: number): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    db.prepare(`
      UPDATE bills SET 
        status = 'Cancelled', 
        cancellation_reason = ?, 
        cancelled_by = ?, 
        cancelled_at = datetime('now','localtime'),
        updated_at = datetime('now','localtime')
      WHERE id = ? AND status = 'Finalized'
    `).run(reason, cancelledBy, billId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function addPayment(data: {
  bill_id: number;
  patient_id: number;
  amount: number;
  payment_mode: string;
  cheque_number?: string;
  bank_name?: string;
  transaction_id?: string;
  notes?: string;
  received_by?: number;
}): { success: boolean; receipt_number?: string; error?: string } {
  const db = getDatabase();
  try {
    let receiptNumber = '';

    const tx = db.transaction(() => {
      receiptNumber = generateReceiptNumber(db);
      const now = new Date();

      db.prepare(`
        INSERT INTO payments (receipt_number, bill_id, patient_id, amount, payment_mode, 
          payment_date, payment_time, cheque_number, bank_name, transaction_id, notes, received_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiptNumber, data.bill_id, data.patient_id, data.amount, data.payment_mode,
        now.toISOString().split('T')[0], now.toTimeString().slice(0, 8),
        data.cheque_number ?? null, data.bank_name ?? null, data.transaction_id ?? null,
        data.notes ?? null, data.received_by ?? null
      );

      // Update bill paid/balance amounts
      const totalPaid = (db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE bill_id = ?').get(data.bill_id) as { total: number }).total;
      const bill = db.prepare('SELECT net_amount FROM bills WHERE id = ?').get(data.bill_id) as { net_amount: number };
      const balance = Math.max(0, bill.net_amount - totalPaid);
      const status = balance === 0 ? 'Finalized' : 'Finalized';

      db.prepare(`
        UPDATE bills SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(totalPaid, balance, status, data.bill_id);
    });

    tx();
    return { success: true, receipt_number: receiptNumber };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record payment' };
  }
}

export function getBillPayments(billId: number): Payment[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT p.*, u.full_name as receiver_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.bill_id = ?
    ORDER BY p.payment_date DESC, p.created_at DESC
  `).all(billId) as Payment[];
}

export function getTodayCollection(): number {
  const db = getDatabase();
  return (db.prepare(`
    SELECT COALESCE(SUM(amount),0) as total FROM payments 
    WHERE payment_date = date('now','localtime')
  `).get() as { total: number }).total;
}

export function getTodayBillCount(): number {
  const db = getDatabase();
  return (db.prepare(`
    SELECT COUNT(*) as count FROM bills 
    WHERE bill_date = date('now','localtime') AND status != 'Cancelled'
  `).get() as { count: number }).count;
}

export function getPendingPayments(): number {
  const db = getDatabase();
  return (db.prepare(`
    SELECT COALESCE(SUM(balance_amount),0) as total FROM bills WHERE status = 'Finalized' AND balance_amount > 0
  `).get() as { total: number }).total;
}

export function getTotalRevenue(): number {
  const db = getDatabase();
  return (db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM payments`).get() as { total: number }).total;
}

export function getDailyRevenue(days = 30): Array<{ date: string; amount: number }> {
  const db = getDatabase();
  return db.prepare(`
    SELECT payment_date as date, COALESCE(SUM(amount),0) as amount
    FROM payments
    WHERE payment_date >= date('now','localtime','-${days} days')
    GROUP BY payment_date
    ORDER BY payment_date
  `).all() as Array<{ date: string; amount: number }>;
}

export function getPaymentModeBreakdown(): Array<{ payment_mode: string; amount: number }> {
  const db = getDatabase();
  return db.prepare(`
    SELECT payment_mode, COALESCE(SUM(amount),0) as amount
    FROM payments
    GROUP BY payment_mode
    ORDER BY amount DESC
  `).all() as Array<{ payment_mode: string; amount: number }>;
}

export function getServiceRevenue(): Array<{ service_name: string; total: number; count: number }> {
  const db = getDatabase();
  return db.prepare(`
    SELECT bi.service_name, SUM(bi.amount) as total, COUNT(*) as count
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.status != 'Cancelled'
    GROUP BY bi.service_name
    ORDER BY total DESC
    LIMIT 20
  `).all() as Array<{ service_name: string; total: number; count: number }>;
}
