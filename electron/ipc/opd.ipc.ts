import { ipcMain } from 'electron';
import { requireSession } from './auth.ipc';
import { createOpdVisit, getOpdVisits, getTodayOpdCount } from '../database/repositories/opd.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerOpdIpc(): void {
  ipcMain.handle('opd:create', async (_event, data: object) => {
    try {
      const session = requireSession();
      const result = createOpdVisit(data as Parameters<typeof createOpdVisit>[0], session.userId);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'OPD', record_id: result.id, description: `OPD visit created: ${result.opd_number}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('opd:get-all', async (_event, { patientId, limit, offset }: { patientId?: number; limit?: number; offset?: number }) => {
    try {
      requireSession();
      return getOpdVisits(patientId, limit, offset);
    } catch (e: unknown) {
      return { visits: [], total: 0 };
    }
  });

  ipcMain.handle('opd:today-count', async () => {
    try {
      requireSession();
      return { count: getTodayOpdCount() };
    } catch { return { count: 0 }; }
  });
}
