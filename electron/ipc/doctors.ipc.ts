import { ipcMain } from 'electron';
import { requireSession, requireAdmin } from './auth.ipc';
import { getAllDoctors, createDoctor, updateDoctor, getAllDepartments } from '../database/repositories/doctors.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerDoctorsIpc(): void {
  ipcMain.handle('doctors:get-all', async (_event, activeOnly?: boolean) => {
    try { requireSession(); return { success: true, doctors: getAllDoctors(activeOnly ?? true) }; } catch { return { success: false, doctors: [] }; }
  });
  ipcMain.handle('doctors:create', async (_event, data: object) => {
    try {
      const session = requireAdmin();
      const result = createDoctor(data as Parameters<typeof createDoctor>[0]);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'Doctor', record_id: result.id, description: 'Doctor created' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('doctors:update', async (_event, { id, data }: { id: number; data: object }) => {
    try {
      const session = requireAdmin();
      const result = updateDoctor(id, data as Parameters<typeof updateDoctor>[1]);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'Doctor', record_id: id, description: 'Doctor updated' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('doctors:get-departments', async () => {
    try { requireSession(); return { success: true, departments: getAllDepartments() }; } catch { return { success: false, departments: [] }; }
  });
}
