import { getDatabase } from '../db';

export interface Doctor {
  id: number;
  doctor_name: string;
  specialization: string | null;
  department_id: number | null;
  registration_number: string | null;
  mobile: string | null;
  email: string | null;
  is_active: number;
  department_name?: string;
}

export function getAllDoctors(activeOnly = true): Doctor[] {
  const db = getDatabase();
  const where = activeOnly ? 'WHERE d.is_active = 1' : '';
  return db.prepare(`
    SELECT d.*, dept.name as department_name
    FROM doctors d
    LEFT JOIN departments dept ON d.department_id = dept.id
    ${where}
    ORDER BY d.doctor_name
  `).all() as Doctor[];
}

export function createDoctor(data: Omit<Doctor, 'id' | 'department_name'>): { success: boolean; id?: number; error?: string } {
  const db = getDatabase();
  try {
    const result = db.prepare(`
      INSERT INTO doctors (doctor_name, specialization, department_id, registration_number, mobile, email, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.doctor_name, data.specialization, data.department_id, data.registration_number, data.mobile, data.email, data.is_active ?? 1);
    return { success: true, id: result.lastInsertRowid as number };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function updateDoctor(id: number, data: Partial<Omit<Doctor, 'id' | 'department_name'>>): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    db.prepare(`
      UPDATE doctors SET
        doctor_name = COALESCE(?, doctor_name),
        specialization = ?,
        department_id = ?,
        registration_number = ?,
        mobile = ?,
        email = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(data.doctor_name, data.specialization, data.department_id, data.registration_number, data.mobile, data.email, data.is_active, id);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function getAllDepartments(): Array<{ id: number; name: string; is_active: number }> {
  const db = getDatabase();
  return db.prepare('SELECT * FROM departments WHERE is_active = 1 ORDER BY name').all() as Array<{ id: number; name: string; is_active: number }>;
}
