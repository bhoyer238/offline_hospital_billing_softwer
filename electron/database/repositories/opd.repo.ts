import { getDatabase } from '../db';

export interface OpdVisit {
  id: number;
  opd_number: string;
  patient_id: number;
  doctor_id: number | null;
  department_id: number | null;
  visit_date: string;
  visit_time: string | null;
  consultation_fee: number;
  other_charges: number;
  discount: number;
  total: number;
  payment_status: string;
  payment_mode: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  patient_name?: string;
  uhid?: string;
  doctor_name?: string;
  department_name?: string;
}

function generateOpdNumber(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();
  
  const tx = db.transaction(() => {
    const seq = db.prepare('SELECT last_number FROM opd_sequence WHERE year = ?').get(year) as { last_number: number } | undefined;
    let nextNum: number;
    if (seq) {
      nextNum = seq.last_number + 1;
      db.prepare('UPDATE opd_sequence SET last_number = ? WHERE year = ?').run(nextNum, year);
    } else {
      nextNum = 1;
      db.prepare('INSERT INTO opd_sequence (year, last_number) VALUES (?, ?)').run(year, nextNum);
    }
    return nextNum;
  });

  const num = tx();
  const settings = db.prepare('SELECT opd_prefix FROM hospital_settings WHERE id = 1').get() as { opd_prefix: string };
  const prefix = settings?.opd_prefix || 'OPD';
  return `${prefix}/${year}/${String(num).padStart(4, '0')}`;
}

export function createOpdVisit(data: Omit<OpdVisit, 'id' | 'opd_number' | 'created_at'>, createdBy?: number): { success: boolean; id?: number; opd_number?: string; error?: string } {
  const db = getDatabase();
  try {
    let opdNumber = '';
    let visitId = 0;

    const tx = db.transaction(() => {
      opdNumber = generateOpdNumber(db);
      const result = db.prepare(`
        INSERT INTO opd_visits (opd_number, patient_id, doctor_id, department_id, visit_date, visit_time,
          consultation_fee, other_charges, discount, total, payment_status, payment_mode, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(opdNumber, data.patient_id, data.doctor_id, data.department_id, data.visit_date, data.visit_time,
        data.consultation_fee, data.other_charges, data.discount, data.total,
        data.payment_status, data.payment_mode, data.notes, createdBy ?? null);
      visitId = result.lastInsertRowid as number;
    });

    tx();
    return { success: true, id: visitId, opd_number: opdNumber };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function getOpdVisits(patientId?: number, limit = 50, offset = 0): { visits: OpdVisit[]; total: number } {
  const db = getDatabase();
  const where = patientId ? 'WHERE o.patient_id = ?' : '';
  const params: (number | string)[] = patientId ? [patientId] : [];

  const total = (db.prepare(`SELECT COUNT(*) as count FROM opd_visits o ${where}`).get(...params) as { count: number }).count;
  const visits = db.prepare(`
    SELECT o.*, p.patient_name, p.uhid, d.doctor_name, dept.name as department_name
    FROM opd_visits o
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.doctor_id = d.id
    LEFT JOIN departments dept ON o.department_id = dept.id
    ${where}
    ORDER BY o.visit_date DESC, o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as OpdVisit[];

  return { visits, total };
}

export function getTodayOpdCount(): number {
  const db = getDatabase();
  return (db.prepare(`SELECT COUNT(*) as count FROM opd_visits WHERE visit_date = date('now','localtime')`).get() as { count: number }).count;
}
