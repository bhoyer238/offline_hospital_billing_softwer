import { ipcMain } from 'electron';
import { requireAdmin } from './auth.ipc';
import { getAllUsers, toggleUserStatus, updateUser, getRoles } from '../database/repositories/users.repo';
import { createUser, changePassword } from '../database/repositories/auth.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerUsersIpc(): void {
  ipcMain.handle('users:get-all', async () => {
    try { requireAdmin(); return { success: true, users: getAllUsers() }; } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed', users: [] }; }
  });
  ipcMain.handle('users:create', async (_event, data: { username: string; password: string; full_name: string; role_id: number }) => {
    try {
      const session = requireAdmin();
      const result = createUser({ ...data, created_by: session.userId });
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'User', record_id: result.id, description: `User created: ${data.username}` });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('users:update', async (_event, { id, data }: { id: number; data: object }) => {
    try {
      const session = requireAdmin();
      const result = updateUser(id, data as Parameters<typeof updateUser>[1]);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'User', record_id: id, description: 'User updated' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('users:toggle-status', async (_event, { id, isActive }: { id: number; isActive: boolean }) => {
    try {
      const session = requireAdmin();
      const result = toggleUserStatus(id, isActive);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: isActive ? 'ACTIVATE' : 'DEACTIVATE', module: 'User', record_id: id, description: `User ${isActive ? 'activated' : 'deactivated'}` });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('users:reset-password', async (_event, { id, newPassword }: { id: number; newPassword: string }) => {
    try {
      const session = requireAdmin();
      const result = changePassword(id, newPassword);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'RESET_PASSWORD', module: 'User', record_id: id, description: 'Password reset by admin' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });
  ipcMain.handle('users:get-roles', async () => {
    try { requireAdmin(); return { success: true, roles: getRoles() }; } catch (e: unknown) { return { success: false, roles: [] }; }
  });
}
