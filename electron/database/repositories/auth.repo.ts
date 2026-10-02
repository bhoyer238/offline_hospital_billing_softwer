import { getDatabase } from '../db';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function isSetupComplete(): boolean {
  const row = getDatabase().prepare("SELECT COUNT(*) as count FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')").get() as { count: number };
  return row.count > 0;
}

export interface UserRecord {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
}

export function loginUser(username: string, password: string): { success: boolean; user?: UserRecord; error?: string } {
  const db = getDatabase();
  const user = db.prepare(`
    SELECT u.*, r.name as role_name FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.username = ? AND u.is_active = 1
  `).get(username) as (UserRecord & { password_hash: string }) | undefined;

  if (!user) return { success: false, error: 'Invalid username or password' };

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return { success: false, error: 'Invalid username or password' };

  // Update last login
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  const { password_hash, ...safeUser } = user;
  return { success: true, user: safeUser };
}

export function setupAdmin(data: { hospitalName: string; address?: string; phone?: string; username: string; password: string; fullName: string }): { success: boolean; error?: string } {
  const db = getDatabase();
  const hash = bcrypt.hashSync(data.password, SALT_ROUNDS);

  const tx = db.transaction(() => {
    // Update hospital settings
    db.prepare('UPDATE hospital_settings SET hospital_name = ?, address = ?, phone = ? WHERE id = 1').run(data.hospitalName, data.address || '', data.phone || '');

    // Create admin user
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get() as { id: number } | undefined;
    if (!adminRole) throw new Error('Admin role not found');

    db.prepare('INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, 1)').run(data.username, hash, data.fullName, adminRole.id);
  });

  tx();
  return { success: true };
}

export function changePassword(userId: number, newPassword: string): { success: boolean; error?: string } {
  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  getDatabase().prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, userId);
  return { success: true };
}

export function createUser(data: { username: string; password: string; full_name: string; role_id: number; created_by?: number }): { success: boolean; id?: number; error?: string } {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
  if (existing) return { success: false, error: 'Username already exists' };

  const hash = bcrypt.hashSync(data.password, SALT_ROUNDS);
  const result = db.prepare('INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, 1)').run(data.username, hash, data.full_name, data.role_id);
  return { success: true, id: result.lastInsertRowid as number };
}
