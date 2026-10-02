import { ipcMain } from 'electron';
import { requireSession } from './auth.ipc';
import { createPatient, updatePatient, getPatient, searchPatients, getPatientCount } from '../database/repositories/patients.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerPatientIpc(): void {
  ipcMain.handle('patients:create', async (_event, data: object) => {
    try {
      const session = requireSession();
      const result = createPatient(data as Parameters<typeof createPatient>[0], session.userId);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'Patient', record_id: result.id, description: `Patient created with UHID: ${result.uhid}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create patient' };
    }
  });

  ipcMain.handle('patients:update', async (_event, { id, data }: { id: number; data: object }) => {
    try {
      const session = requireSession();
      const result = updatePatient(id, data as Parameters<typeof updatePatient>[1]);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'Patient', record_id: id, description: 'Patient record updated' });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update patient' };
    }
  });

  ipcMain.handle('patients:get', async (_event, id: number) => {
    try {
      requireSession();
      const patient = getPatient(id);
      return { success: true, patient };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Not found' };
    }
  });

  ipcMain.handle('patients:search', async (_event, { query, limit, offset }: { query: string; limit?: number; offset?: number }) => {
    try {
      requireSession();
      return searchPatients(query || '', limit, offset);
    } catch (e: unknown) {
      return { patients: [], total: 0 };
    }
  });

  ipcMain.handle('patients:get-count', async () => {
    try {
      requireSession();
      return { count: getPatientCount() };
    } catch { return { count: 0 }; }
  });
}
