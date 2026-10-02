import { getDatabase } from '../db';

export interface Service {
  id: number;
  service_name: string;
  category_id: number;
  rate: number;
  unit: string;
  tax_applicable: number;
  description: string | null;
  is_active: number;
  category_name?: string;
}

export function getAllServices(activeOnly = true): Service[] {
  const db = getDatabase();
  const where = activeOnly ? 'WHERE s.is_active = 1' : '';
  return db.prepare(`
    SELECT s.*, sc.name as category_name
    FROM services s
    JOIN service_categories sc ON s.category_id = sc.id
    ${where}
    ORDER BY sc.sort_order, s.service_name
  `).all() as Service[];
}

export function searchServices(query: string): Service[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT s.*, sc.name as category_name
    FROM services s
    JOIN service_categories sc ON s.category_id = sc.id
    WHERE s.is_active = 1 AND (s.service_name LIKE ? OR sc.name LIKE ?)
    ORDER BY sc.sort_order, s.service_name
    LIMIT 50
  `).all(`%${query}%`, `%${query}%`) as Service[];
}

export function createService(data: Omit<Service, 'id' | 'category_name'>): { success: boolean; id?: number; error?: string } {
  const db = getDatabase();
  try {
    const result = db.prepare(`
      INSERT INTO services (service_name, category_id, rate, unit, tax_applicable, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.service_name, data.category_id, data.rate, data.unit, data.tax_applicable ?? 0, data.description, data.is_active ?? 1);
    return { success: true, id: result.lastInsertRowid as number };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function updateService(id: number, data: Partial<Omit<Service, 'id' | 'category_name'>>): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    db.prepare(`
      UPDATE services SET
        service_name = COALESCE(?, service_name),
        category_id = COALESCE(?, category_id),
        rate = COALESCE(?, rate),
        unit = COALESCE(?, unit),
        tax_applicable = COALESCE(?, tax_applicable),
        description = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(data.service_name, data.category_id, data.rate, data.unit, data.tax_applicable, data.description, data.is_active, id);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export function getAllServiceCategories(): Array<{ id: number; name: string; sort_order: number; is_active: number }> {
  const db = getDatabase();
  return db.prepare('SELECT * FROM service_categories WHERE is_active = 1 ORDER BY sort_order, name').all() as Array<{ id: number; name: string; sort_order: number; is_active: number }>;
}
