import { getDatabase } from '../db';

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  module: string;
  record_id: number | null;
  description: string | null;
  created_at: string;
}

export function addAuditLog(data: {
  user_id?: number;
  username?: string;
  action: string;
  module: string;
  record_id?: number;
  description?: string;
}): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, module, record_id, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.user_id ?? null,
      data.username ?? null,
      data.action,
      data.module,
      data.record_id ?? null,
      data.description ?? null
    );
  } catch {
    // Audit log failure should never break main operations
  }
}

export function getAuditLogs(filters: { module?: string; action?: string; dateFrom?: string; dateTo?: string; search?: string }, limit = 100, offset = 0): { logs: AuditLog[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.module) { conditions.push('a.module = ?'); params.push(filters.module); }
  if (filters.action) { conditions.push('a.action = ?'); params.push(filters.action); }
  if (filters.dateFrom) { conditions.push('date(a.created_at) >= ?'); params.push(filters.dateFrom); }
  if (filters.dateTo) { conditions.push('date(a.created_at) <= ?'); params.push(filters.dateTo); }
  if (filters.search) {
    conditions.push('(a.username LIKE ? OR a.description LIKE ? OR a.action LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM audit_logs a ${where}`).get(...params) as { count: number }).count;
  const logs = db.prepare(`
    SELECT a.* FROM audit_logs a
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as AuditLog[];

  return { logs, total };
}
