import { getDatabase } from '../db';

export function getAllUsers() {
  return getDatabase().prepare(`
    SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active, u.last_login, u.created_at
    FROM users u JOIN roles r ON u.role_id = r.id
    ORDER BY u.full_name
  `).all();
}

export function updateUser(id: number, data: { full_name?: string; role_id?: number }): { success: boolean } {
  const db = getDatabase();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.full_name !== undefined) { sets.push('full_name = ?'); params.push(data.full_name); }
  if (data.role_id !== undefined) { sets.push('role_id = ?'); params.push(data.role_id); }
  if (!sets.length) return { success: true };
  sets.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return { success: true };
}

export function toggleUserStatus(id: number, isActive: boolean): { success: boolean } {
  getDatabase().prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, id);
  return { success: true };
}

export function getRoles() {
  return getDatabase().prepare('SELECT id, name, display_name FROM roles ORDER BY id').all();
}
