import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { requireAdmin } from './auth.ipc';
import { getDatabasePath, getAppDataPath, closeDatabase, initDatabase, checkDatabaseIntegrity } from '../database/db';
import { addAuditLog } from '../database/repositories/audit.repo';
import { getHospitalSettings } from '../database/repositories/settings.repo';

function getBackupDir(): string {
  return path.join(getAppDataPath(), 'backups');
}

function formatDateTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}_${h}${min}${s}`;
}

export function createBackup(targetDir?: string): { success: boolean; filePath?: string; error?: string } {
  try {
    const backupDir = targetDir || getBackupDir();
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const filename = `HospitalBackup_${formatDateTime()}.db`;
    const destPath = path.join(backupDir, filename);
    const srcPath = getDatabasePath();

    fs.copyFileSync(srcPath, destPath);

    return { success: true, filePath: destPath };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Backup failed' };
  }
}

export function registerBackupIpc(): void {
  ipcMain.handle('backup:create', async () => {
    try {
      const session = requireAdmin();

      const result = await dialog.showOpenDialog({
        title: 'Select Backup Folder',
        properties: ['openDirectory'],
        defaultPath: getBackupDir(),
      });

      const targetDir = result.canceled ? getBackupDir() : result.filePaths[0];
      const backupResult = createBackup(targetDir);

      if (backupResult.success) {
        // Rotate old backups
        const settings = getHospitalSettings();
        const maxCopies = settings.backup_copies || 10;
        const files = fs.readdirSync(targetDir)
          .filter(f => f.startsWith('HospitalBackup_') && f.endsWith('.db'))
          .sort();
        while (files.length > maxCopies) {
          const oldest = files.shift();
          if (oldest) fs.unlinkSync(path.join(targetDir, oldest));
        }

        addAuditLog({ user_id: session.userId, username: session.username, action: 'BACKUP', module: 'Backup', description: `Backup created: ${backupResult.filePath}` });
      }

      return backupResult;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Backup failed' };
    }
  });

  ipcMain.handle('backup:select-file', async () => {
    try {
      requireAdmin();
      const result = await dialog.showOpenDialog({
        title: 'Select Backup File to Restore',
        filters: [{ name: 'Database', extensions: ['db'] }],
        properties: ['openFile'],
      });
      if (result.canceled) return { success: false, error: 'Cancelled' };
      return { success: true, filePath: result.filePaths[0] };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('backup:restore', async (_event, filePath: string) => {
    try {
      const session = requireAdmin();

      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // First, create a safety backup of current DB
      const safetyBackup = createBackup(getBackupDir());
      if (!safetyBackup.success) {
        return { success: false, error: `Could not create safety backup before restore: ${safetyBackup.error}` };
      }

      // Validate the backup file by checking it's a SQLite DB
      const header = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);
      const magic = header.toString('utf8', 0, 16);
      if (!magic.startsWith('SQLite format 3')) {
        return { success: false, error: 'Invalid backup file. Not a valid SQLite database.' };
      }

      // Close DB, restore, re-open
      closeDatabase();
      fs.copyFileSync(filePath, getDatabasePath());
      initDatabase();

      addAuditLog({ user_id: session.userId, username: session.username, action: 'RESTORE', module: 'Backup', description: `Database restored from: ${filePath}` });

      return { success: true };
    } catch (e: unknown) {
      // Try to re-initialize DB if restore failed
      try { initDatabase(); } catch { /* ignore */ }
      return { success: false, error: e instanceof Error ? e.message : 'Restore failed' };
    }
  });

  ipcMain.handle('backup:list', async () => {
    try {
      requireAdmin();
      const backupDir = getBackupDir();
      if (!fs.existsSync(backupDir)) return { success: true, files: [] };

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const stats = fs.statSync(path.join(backupDir, f));
          return { name: f, path: path.join(backupDir, f), size: stats.size, created: stats.mtime };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return { success: true, files };
    } catch (e: unknown) {
      return { success: false, files: [], error: e instanceof Error ? e.message : 'Failed' };
    }
  });
}
