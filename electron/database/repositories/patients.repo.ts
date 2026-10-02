import { getDatabase } from '../db';

export interface Patient {
  id: number;
  uhid: string;
  registration_number: string | null;
  patient_name: string;
  father_husband_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  age_unit: string;
  gender: string;
  blood_group: string | null;
  mobile: string | null;
  mobile2: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  taluka: string | null;
  district: string | null;
  pin_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_mobile: string | null;
  doctor_id: number | null;
  department_id: number | null;
  insurance_name: string | null;
  policy_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  doctor_name?: string;
  department_name?: string;
}

export interface PatientListItem {
  id: number;
  uhid: string;
  patient_name: string;
  age: number | null;
  age_unit: string;
  gender: string;
  mobile: string | null;
  city: string | null;
  doctor_name: string | null;
  created_at: string;
}

function generateUHID(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();
  
  const generateTx = db.transaction(() => {
    const seq = db.prepare('SELECT last_number FROM uhid_sequence WHERE year = ?').get(year) as { last_number: number } | undefined;
    
    let nextNum: number;
    if (seq) {
      nextNum = seq.last_number + 1;
      db.prepare('UPDATE uhid_sequence SET last_number = ? WHERE year = ?').run(nextNum, year);
    } else {
      nextNum = 1;
      db.prepare('INSERT INTO uhid_sequence (year, last_number) VALUES (?, ?)').run(year, nextNum);
    }
    return nextNum;
  });

  const num = generateTx();
  
  const settings = db.prepare('SELECT uhid_prefix FROM hospital_settings WHERE id = 1').get() as { uhid_prefix: string };
  const prefix = settings?.uhid_prefix || 'UHID';
  
  return `${prefix}-${year}-${String(num).padStart(6, '0')}`;
}

export function createPatient(data: Omit<Patient, 'id' | 'uhid' | 'created_at' | 'updated_at'>, createdBy?: number): { success: boolean; id?: number; uhid?: string; error?: string } {
  const db = getDatabase();

  try {
    const uhid = generateUHID(db);
    
    const result = db.prepare(`
      INSERT INTO patients (
        uhid, registration_number, patient_name, father_husband_name, 
        date_of_birth, age, age_unit, gender, blood_group,
        mobile, mobile2, email, address, city, taluka, district, pin_code,
        emergency_contact_name, emergency_contact_mobile,
        doctor_id, department_id, insurance_name, policy_number, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uhid, data.registration_number, data.patient_name, data.father_husband_name,
      data.date_of_birth, data.age, data.age_unit || 'years', data.gender, data.blood_group,
      data.mobile, data.mobile2, data.email, data.address, data.city, data.taluka, data.district, data.pin_code,
      data.emergency_contact_name, data.emergency_contact_mobile,
      data.doctor_id, data.department_id, data.insurance_name, data.policy_number, data.notes,
      createdBy ?? null
    );

    return { success: true, id: result.lastInsertRowid as number, uhid };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create patient' };
  }
}

export function updatePatient(id: number, data: Partial<Omit<Patient, 'id' | 'uhid' | 'created_at'>>): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    db.prepare(`
      UPDATE patients SET
        patient_name = COALESCE(?, patient_name),
        father_husband_name = ?,
        date_of_birth = ?,
        age = ?,
        age_unit = COALESCE(?, age_unit),
        gender = COALESCE(?, gender),
        blood_group = ?,
        mobile = ?,
        mobile2 = ?,
        email = ?,
        address = ?,
        city = ?,
        taluka = ?,
        district = ?,
        pin_code = ?,
        emergency_contact_name = ?,
        emergency_contact_mobile = ?,
        doctor_id = ?,
        department_id = ?,
        insurance_name = ?,
        policy_number = ?,
        notes = ?,
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      data.patient_name, data.father_husband_name, data.date_of_birth, data.age,
      data.age_unit, data.gender, data.blood_group, data.mobile, data.mobile2, data.email,
      data.address, data.city, data.taluka, data.district, data.pin_code,
      data.emergency_contact_name, data.emergency_contact_mobile,
      data.doctor_id, data.department_id, data.insurance_name, data.policy_number, data.notes,
      id
    );
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to update patient' };
  }
}

export function getPatient(id: number): Patient | null {
  const db = getDatabase();
  return db.prepare(`
    SELECT p.*, d.doctor_name, dept.name as department_name
    FROM patients p
    LEFT JOIN doctors d ON p.doctor_id = d.id
    LEFT JOIN departments dept ON p.department_id = dept.id
    WHERE p.id = ?
  `).get(id) as Patient | null;
}

export function getPatientByUHID(uhid: string): Patient | null {
  const db = getDatabase();
  return db.prepare(`
    SELECT p.*, d.doctor_name, dept.name as department_name
    FROM patients p
    LEFT JOIN doctors d ON p.doctor_id = d.id
    LEFT JOIN departments dept ON p.department_id = dept.id
    WHERE p.uhid = ?
  `).get(uhid) as Patient | null;
}

export function searchPatients(query: string, limit = 50, offset = 0): { patients: PatientListItem[]; total: number } {
  const db = getDatabase();
  const searchTerm = `%${query}%`;

  const whereClause = query
    ? `WHERE (p.patient_name LIKE ? OR p.uhid LIKE ? OR p.mobile LIKE ? OR CAST(p.id AS TEXT) LIKE ?)`
    : '';

  const params = query ? [searchTerm, searchTerm, searchTerm, searchTerm] : [];

  const total = (db.prepare(`SELECT COUNT(*) as count FROM patients p ${whereClause}`).get(...params) as { count: number }).count;

  const patients = db.prepare(`
    SELECT p.id, p.uhid, p.patient_name, p.age, p.age_unit, p.gender, 
           p.mobile, p.city, p.created_at, d.doctor_name
    FROM patients p
    LEFT JOIN doctors d ON p.doctor_id = d.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as PatientListItem[];

  return { patients, total };
}

export function getPatientCount(): number {
  const db = getDatabase();
  return (db.prepare('SELECT COUNT(*) as count FROM patients WHERE is_active = 1').get() as { count: number }).count;
}
