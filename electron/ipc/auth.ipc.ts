import { ipcMain } from 'electron';
import { loginUser as login, createUser, isSetupComplete, changePassword, UserRecord } from '../database/repositories/auth.repo';
import { addAuditLog } from '../database/repositories/audit.repo';
import { updateHospitalSettings } from '../database/repositories/settings.repo';

// In-memory session store
interface Session {
  userId: number;
  username: string;
  fullName: string;
  roleId: number;
  roleName: string;
  loginTime: number;
}

let currentSession: Session | null = null;

export function getSession(): Session | null {
  return currentSession;
}

export function requireSession(): Session {
  if (!currentSession) throw new Error('Not authenticated');
  return currentSession;
}

export function requireAdmin(): Session {
  const session = requireSession();
  if (session.roleName !== 'admin') throw new Error('Administrator access required');
  return session;
}

export function registerAuthIpc(): void {
  ipcMain.handle('auth:login', async (_event, { username, password }: { username: string; password: string }) => {
    try {
      if (!username || !password) return { success: false, error: 'Username and password are required' };

      const result = login(String(username).trim(), String(password));

      if (result.success && result.user) {
        currentSession = {
          userId: result.user.id,
          username: result.user.username,
          fullName: result.user.full_name,
          roleId: result.user.role_id,
          roleName: result.user.role_name,
          loginTime: Date.now(),
        };

        addAuditLog({
          user_id: result.user.id,
          username: result.user.username,
          action: 'LOGIN',
          module: 'Auth',
          description: `User ${result.user.username} logged in`,
        });

        return { success: true, user: { ...result.user } };
      }

      return result;
    } catch (e: unknown) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    if (currentSession) {
      addAuditLog({
        user_id: currentSession.userId,
        username: currentSession.username,
        action: 'LOGOUT',
        module: 'Auth',
        description: `User ${currentSession.username} logged out`,
      });
      currentSession = null;
    }
    return { success: true };
  });

  ipcMain.handle('auth:is-setup-complete', async () => {
    return { complete: isSetupComplete() };
  });

  ipcMain.handle('auth:setup-admin', async (_event, data: {
    hospitalName: string;
    address: string;
    phone: string;
    username: string;
    password: string;
    fullName: string;
  }) => {
    try {
      if (isSetupComplete()) return { success: false, error: 'Setup already complete' };

      // Update hospital settings
      updateHospitalSettings({ hospital_name: data.hospitalName, address: data.address, phone: data.phone });

      // Create admin user
      const result = createUser({
        username: data.username,
        password: data.password,
        full_name: data.fullName,
        role_id: 1, // admin
      });

      if (!result.success) return result;

      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Setup failed' };
    }
  });

  ipcMain.handle('auth:change-password', async (_event, { userId, newPassword }: { userId: number; password: string; newPassword: string }) => {
    try {
      const session = requireSession();
      // Users can change their own password; admin can change anyone's
      if (session.userId !== userId && session.roleName !== 'admin') {
        return { success: false, error: 'Permission denied' };
      }
      return changePassword(userId, newPassword);
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });
}
