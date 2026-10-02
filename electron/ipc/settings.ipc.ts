import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { requireAdmin, requireSession } from './auth.ipc';
import { getHospitalSettings, updateHospitalSettings } from '../database/repositories/settings.repo';
import { getAppDataPath } from '../database/db';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', async () => {
    try { requireSession(); return { success: true, settings: getHospitalSettings() }; } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });

  ipcMain.handle('settings:update', async (_event, data: object) => {
    try {
      const session = requireAdmin();
      const result = updateHospitalSettings(data as Parameters<typeof updateHospitalSettings>[0]);
      if (result.success) addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'Settings', description: 'Hospital settings updated' });
      return result;
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  });

  ipcMain.handle('settings:upload-logo', async () => {
    try {
      requireAdmin();
      const result = await dialog.showOpenDialog({
        title: 'Select Hospital Logo',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
      }

      const srcPath = result.filePaths[0];
      const logoDir = path.join(getAppDataPath(), 'uploads', 'logos');
      if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
      const ext = path.extname(srcPath);
      const destPath = path.join(logoDir, `hospital-logo${ext}`);

      fs.copyFileSync(srcPath, destPath);
      updateHospitalSettings({ logo_path: destPath });

      // Return base64 so renderer can display it immediately
      const data = fs.readFileSync(destPath);
      const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      const base64 = `data:${mime};base64,${data.toString('base64')}`;

      return { success: true, logoPath: destPath, base64 };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to upload logo' };
    }
  });

  // Read logo as base64 data URL for renderer display
  ipcMain.handle('settings:read-logo', async (_event, logoPath: string) => {
    try {
      if (!logoPath || !fs.existsSync(logoPath)) {
        return { success: false };
      }
      const data = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      const base64 = `data:${mime};base64,${data.toString('base64')}`;
      return { success: true, base64 };
    } catch {
      return { success: false };
    }
  });
}
