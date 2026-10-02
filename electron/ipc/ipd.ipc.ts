import { ipcMain } from 'electron';
import { requireSession } from './auth.ipc';
import { createIpdAdmission, updateIpdAdmission, getIpdAdmission, getIpdAdmissions, getTodayIpdCount, getAdmittedCount } from '../database/repositories/ipd.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerIpdIpc(): void {
  ipcMain.handle('ipd:create', async (_event, data: object) => {
    try {
      const session = requireSession();
      const result = createIpdAdmission(data as Parameters<typeof createIpdAdmission>[0], session.userId);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'IPD', record_id: result.id, description: `IPD admission created: ${result.ipd_number}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('ipd:update', async (_event, { id, data }: { id: number; data: object }) => {
    try {
      const session = requireSession();
      const result = updateIpdAdmission(id, data as Parameters<typeof updateIpdAdmission>[1]);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'IPD', record_id: id, description: 'IPD admission updated' });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('ipd:get', async (_event, id: number) => {
    try {
      requireSession();
      return { success: true, admission: getIpdAdmission(id) };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('ipd:get-all', async (_event, { filters, limit, offset }: { filters: object; limit?: number; offset?: number }) => {
    try {
      requireSession();
      return getIpdAdmissions(filters as Parameters<typeof getIpdAdmissions>[0], limit, offset);
    } catch { return { admissions: [], total: 0 }; }
  });

  ipcMain.handle('ipd:today-count', async () => {
    try { requireSession(); return { count: getTodayIpdCount() }; } catch { return { count: 0 }; }
  });

  ipcMain.handle('ipd:admitted-count', async () => {
    try { requireSession(); return { count: getAdmittedCount() }; } catch { return { count: 0 }; }
  });
}
