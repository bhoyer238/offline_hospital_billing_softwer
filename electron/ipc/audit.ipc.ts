import { ipcMain } from 'electron';
import { requireSession, requireAdmin } from './auth.ipc';
import { addAuditLog, getAuditLogs } from '../database/repositories/audit.repo';

export function registerAuditIpc(): void {
  ipcMain.handle('audit:get-logs', async (_event, { filters, limit, offset }: { filters: object; limit?: number; offset?: number }) => {
    try {
      requireAdmin();
      return getAuditLogs(filters as Parameters<typeof getAuditLogs>[0], limit, offset);
    } catch (e: unknown) {
      return { logs: [], total: 0 };
    }
  });

  ipcMain.handle('audit:add-log', async (_event, data: { action: string; module: string; record_id?: number; description?: string }) => {
    try {
      const session = requireSession();
      addAuditLog({ ...data, user_id: session.userId, username: session.username });
      return { success: true };
    } catch { return { success: false }; }
  });
}
