import { ipcMain } from 'electron';
import { requireSession, requireAdmin } from './auth.ipc';
import { getAllServices, searchServices, createService, updateService, getAllServiceCategories } from '../database/repositories/services.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerServicesIpc(): void {
  ipcMain.handle('services:get-all', async (_event, activeOnly?: boolean) => {
    try { requireSession(); return { success: true, services: getAllServices(activeOnly ?? true) }; } catch (e: unknown) { return { success: false, services: [] }; }
  });
  ipcMain.handle('services:search', async (_event, query: string) => {
    try { requireSession(); return { success: true, services: searchServices(query || '') }; } catch { return { success: false, services: [] }; }
  });
  ipcMain.handle('services:create', async (_event, data: object) => {
    try {
      const session = requireAdmin();
      const result = createService(data as Parameters<typeof createService>[0]);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'Service', record_id: result.id, description: 'Service created' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('services:update', async (_event, { id, data }: { id: number; data: object }) => {
    try {
      const session = requireAdmin();
      const result = updateService(id, data as Parameters<typeof updateService>[1]);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'Service', record_id: id, description: 'Service updated' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('services:get-categories', async () => {
    try { requireSession(); return { success: true, categories: getAllServiceCategories() }; } catch { return { success: false, categories: [] }; }
  });
}
