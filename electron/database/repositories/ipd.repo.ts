import { getDatabase } from '../db';

export interface IpdAdmission {
  id: number;
  ipd_number: string;
  patient_id: number;
  admission_date: string;
  admission_time: string | null;
  discharge_date: string | null;
  discharge_time: string | null;
  doctor_id: number | null;
  department_id: number | null;
  room_id: number | null;
  bed_id: number | null;
  diagnosis: string | null;
  tpa_name: string | null;
  claim_number: string | null;
  policy_name: string | null;
  policy_number: string | null;
  insurance_details: string | null;
  category: string;
  status: 'Admitted' | 'Discharged' | 'Cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patient_name?: string;
  uhid?: string;
  mobile?: string;
  doctor_name?: string;
  department_name?: string;
  room_number?: string;
  bed_number?: string;
}

function generateIpdNumber(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();

  const tx = db.transaction(() => {
    const seq = db.prepare('SELECT last_number FROM ipd_sequence WHERE year = ?').get(year) as { last_number: number } | undefined;
    let nextNum: number;
    if (seq) {
      nextNum = seq.last_number + 1;
      db.prepare('UPDATE ipd_sequence SET last_number = ? WHERE year = ?').run(nextNum, year);
    } else {
      nextNum = 1;
      db.prepare('INSERT INTO ipd_sequence (year, last_number) VALUES (?, ?)').run(year, nextNum);
    }
    return nextNum;
  });

  const num = tx();
  const settings = db.prepare('SELECT ipd_prefix FROM hospital_settings WHERE id = 1').get() as { ipd_prefix: string };
  const prefix = settings?.ipd_prefix || 'IPD';
  return `${prefix}/${year}/${String(num).padStart(4, '0')}`;
}

export function createIpdAdmission(data: Omit<IpdAdmission, 'id' | 'ipd_number' | 'created_at' | 'updated_at' | 'status'>, createdBy?: number): { success: boolean; id?: number; ipd_number?: string; error?: string } {
  const db = getDatabase();
  try {
    let ipdNumber = '';
    let admId = 0;

    const tx = db.transaction(() => {
      ipdNumber = generateIpdNumber(db);
      const result = db.prepare(`
        INSERT INTO ipd_admissions (
          ipd_number, patient_id, admission_date, admission_time, doctor_id, department_id,
          room_id, bed_id, diagnosis, tpa_name, claim_number, policy_name, policy_number,
          insurance_details, category, notes, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admitted', ?)
      `).run(
        ipdNumber, data.patient_id, data.admission_date, data.admission_time,
        data.doctor_id, data.department_id, data.room_id, data.bed_id,
        data.diagnosis, data.tpa_name, data.claim_number, data.policy_name, data.policy_number,
        data.insurance_details, data.category || 'General', data.notes, createdBy ?? null
      );

      // Mark bed as occupied
      if (data.bed_id) {
        db.prepare('UPDATE beds SET is_occupied = 1 WHERE id = ?').run(data.bed_id);
      }

      admId = result.lastInsertRowid as number;
    });

    tx();
    return { success: true, id: admId, ipd_number: ipdNumber };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create IPD admission' };
  }
}

export function updateIpdAdmission(id: number, data: Partial<IpdAdmission>): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    db.prepare(`
      UPDATE ipd_admissions SET
        discharge_date = ?,
        discharge_time = ?,
        doctor_id = COALESCE(?, doctor_id),
        department_id = COALESCE(?, department_id),
        diagnosis = ?,
        tpa_name = ?,
        claim_number = ?,
        policy_name = ?,
        policy_number = ?,
        insurance_details = ?,
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        notes = ?,
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      data.discharge_date, data.discharge_time,
      data.doctor_id, data.department_id,
      data.diagnosis, data.tpa_name, data.claim_number, data.policy_name, data.policy_number,
      data.insurance_details, data.category, data.status, data.notes, id
    );

    // If discharging, free bed
    if (data.status === 'Discharged') {
      const adm = db.prepare('SELECT bed_id FROM ipd_admissions WHERE id = ?').get(id) as { bed_id: number | null };
      if (adm?.bed_id) {
        db.prepare('UPDATE beds SET is_occupied = 0 WHERE id = ?').run(adm.bed_id);
      }
    }

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function getIpdAdmission(id: number): IpdAdmission | null {
  const db = getDatabase();
  return db.prepare(`
    SELECT i.*, p.patient_name, p.uhid, p.mobile, p.age, p.age_unit, p.gender,
           p.address, p.city, p.district, p.insurance_name,
           d.doctor_name, dept.name as department_name,
           r.room_number, b.bed_number
    FROM ipd_admissions i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN doctors d ON i.doctor_id = d.id
    LEFT JOIN departments dept ON i.department_id = dept.id
    LEFT JOIN rooms r ON i.room_id = r.id
    LEFT JOIN beds b ON i.bed_id = b.id
    WHERE i.id = ?
  `).get(id) as IpdAdmission | null;
}

export function getIpdAdmissions(filters: { status?: string; patientId?: number; search?: string }, limit = 50, offset = 0): { admissions: IpdAdmission[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status) {
    conditions.push('i.status = ?');
    params.push(filters.status);
  }
  if (filters.patientId) {
    conditions.push('i.patient_id = ?');
    params.push(filters.patientId);
  }
  if (filters.search) {
    conditions.push('(p.patient_name LIKE ? OR p.uhid LIKE ? OR i.ipd_number LIKE ? OR p.mobile LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM ipd_admissions i JOIN patients p ON i.patient_id = p.id ${where}`).get(...params) as { count: number }).count;
  const admissions = db.prepare(`
    SELECT i.*, p.patient_name, p.uhid, p.mobile, d.doctor_name, dept.name as department_name,
           r.room_number, b.bed_number
    FROM ipd_admissions i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN doctors d ON i.doctor_id = d.id
    LEFT JOIN departments dept ON i.department_id = dept.id
    LEFT JOIN rooms r ON i.room_id = r.id
    LEFT JOIN beds b ON i.bed_id = b.id
    ${where}
    ORDER BY i.admission_date DESC, i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as IpdAdmission[];

  return { admissions, total };
}

export function getTodayIpdCount(): number {
  const db = getDatabase();
  return (db.prepare(`SELECT COUNT(*) as count FROM ipd_admissions WHERE admission_date = date('now','localtime')`).get() as { count: number }).count;
}

export function getAdmittedCount(): number {
  const db = getDatabase();
  return (db.prepare(`SELECT COUNT(*) as count FROM ipd_admissions WHERE status = 'Admitted'`).get() as { count: number }).count;
}
