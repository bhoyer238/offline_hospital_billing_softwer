import { getDatabase } from '../db';

export interface ReportRow {
  [key: string]: string | number | null;
}

export function getDailyCollectionReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT 
      p.payment_date as "Date",
      COUNT(DISTINCT p.bill_id) as "Bills",
      COUNT(p.id) as "Transactions",
      SUM(CASE WHEN p.payment_mode = 'Cash' THEN p.amount ELSE 0 END) as "Cash",
      SUM(CASE WHEN p.payment_mode = 'Card' THEN p.amount ELSE 0 END) as "Card",
      SUM(CASE WHEN p.payment_mode = 'UPI' THEN p.amount ELSE 0 END) as "UPI",
      SUM(CASE WHEN p.payment_mode = 'Bank Transfer' THEN p.amount ELSE 0 END) as "Bank Transfer",
      SUM(p.amount) as "Total"
    FROM payments p
    WHERE p.payment_date BETWEEN ? AND ?
    GROUP BY p.payment_date
    ORDER BY p.payment_date DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}

export function getMonthlyCollectionReport(year: number): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT 
      strftime('%m', payment_date) as "Month",
      COUNT(DISTINCT bill_id) as "Bills",
      SUM(amount) as "Total"
    FROM payments
    WHERE strftime('%Y', payment_date) = ?
    GROUP BY strftime('%m', payment_date)
    ORDER BY strftime('%m', payment_date)
  `).all(String(year)) as ReportRow[];
}

export function getPendingPaymentReport(dateFrom?: string, dateTo?: string): ReportRow[] {
  const db = getDatabase();
  const dateFilter = dateFrom && dateTo ? `AND b.bill_date BETWEEN '${dateFrom}' AND '${dateTo}'` : '';
  return db.prepare(`
    SELECT 
      b.bill_number as "Bill No",
      b.bill_date as "Date",
      p.uhid as "UHID",
      p.patient_name as "Patient",
      p.mobile as "Mobile",
      b.net_amount as "Net Amount",
      b.paid_amount as "Paid",
      b.balance_amount as "Balance"
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    WHERE b.status = 'Finalized' AND b.balance_amount > 0 ${dateFilter}
    ORDER BY b.balance_amount DESC
  `).all() as ReportRow[];
}

export function getServiceRevenueReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      bi.service_name as "Service",
      SUM(bi.quantity) as "Qty",
      SUM(bi.amount) as "Total Amount"
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.status != 'Cancelled' AND b.bill_date BETWEEN ? AND ?
    GROUP BY bi.service_name
    ORDER BY SUM(bi.amount) DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}

export function getDoctorRevenueReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      COALESCE(d.doctor_name, 'Unknown') as "Doctor",
      COUNT(b.id) as "Bills",
      SUM(b.net_amount) as "Net Amount",
      SUM(b.paid_amount) as "Collected"
    FROM bills b
    LEFT JOIN doctors d ON b.doctor_id = d.id
    WHERE b.status != 'Cancelled' AND b.bill_date BETWEEN ? AND ?
    GROUP BY b.doctor_id
    ORDER BY SUM(b.net_amount) DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}

export function getPatientReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      p.uhid as "UHID",
      p.patient_name as "Patient",
      p.age as "Age",
      p.gender as "Gender",
      p.mobile as "Mobile",
      p.city as "City",
      p.created_at as "Registered"
    FROM patients p
    WHERE date(p.created_at) BETWEEN ? AND ?
    ORDER BY p.created_at DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}

export function getIpdReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      i.ipd_number as "IPD No",
      p.patient_name as "Patient",
      p.uhid as "UHID",
      i.admission_date as "Admission",
      i.discharge_date as "Discharge",
      d.doctor_name as "Doctor",
      i.status as "Status",
      i.diagnosis as "Diagnosis"
    FROM ipd_admissions i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN doctors d ON i.doctor_id = d.id
    WHERE i.admission_date BETWEEN ? AND ?
    ORDER BY i.admission_date DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}

export function getOpdReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      o.opd_number as "OPD No",
      p.patient_name as "Patient",
      p.uhid as "UHID",
      o.visit_date as "Date",
      d.doctor_name as "Doctor",
      o.total as "Amount",
      o.payment_status as "Status"
    FROM opd_visits o
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.doctor_id = d.id
    WHERE o.visit_date BETWEEN ? AND ?
    ORDER BY o.visit_date DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}

export function getCancelledBillReport(dateFrom: string, dateTo: string): ReportRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      b.bill_number as "Bill No",
      b.bill_date as "Date",
      p.patient_name as "Patient",
      b.net_amount as "Amount",
      b.cancelled_at as "Cancelled At",
      b.cancellation_reason as "Reason",
      u.full_name as "Cancelled By"
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    LEFT JOIN users u ON b.cancelled_by = u.id
    WHERE b.status = 'Cancelled' AND b.bill_date BETWEEN ? AND ?
    ORDER BY b.cancelled_at DESC
  `).all(dateFrom, dateTo) as ReportRow[];
}
