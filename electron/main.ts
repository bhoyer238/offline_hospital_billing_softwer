import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase, getAppDataPath, checkDatabaseIntegrity } from './database/db';
import { registerAuthIpc } from './ipc/auth.ipc';
import { registerPatientIpc } from './ipc/patients.ipc';
import { registerOpdIpc } from './ipc/opd.ipc';
import { registerIpdIpc } from './ipc/ipd.ipc';
import { registerBillingIpc } from './ipc/billing.ipc';
import { registerServicesIpc } from './ipc/services.ipc';
import { registerDoctorsIpc } from './ipc/doctors.ipc';
import { registerUsersIpc } from './ipc/users.ipc';
import { registerSettingsIpc } from './ipc/settings.ipc';
import { registerReportsIpc } from './ipc/reports.ipc';
import { registerBackupIpc } from './ipc/backup.ipc';
import { registerAuditIpc } from './ipc/audit.ipc';
import { registerPrintIpc } from './ipc/print.ipc';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: false,
    },
    titleBarStyle: 'default',
    backgroundColor: '#0f172a',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    initDatabase();
    console.log('Database initialized successfully');

    const integrity = checkDatabaseIntegrity();
    if (!integrity.ok) {
      dialog.showErrorBox('Database Warning', `Database integrity check failed: ${integrity.error}\nPlease restore from a backup.`);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`);
    app.quit();
    return;
  }

  // Register all IPC handlers
  registerAuthIpc();
  registerPatientIpc();
  registerOpdIpc();
  registerIpdIpc();
  registerBillingIpc();
  registerServicesIpc();
  registerDoctorsIpc();
  registerUsersIpc();
  registerSettingsIpc();
  registerReportsIpc();
  registerBackupIpc();
  registerAuditIpc();

  createWindow();
  registerPrintIpc(mainWindow);

  // Handle app paths request
  ipcMain.handle('app:get-paths', () => ({
    userData: app.getPath('userData'),
    appData: getAppDataPath(),
    documents: app.getPath('documents'),
  }));

  ipcMain.handle('app:open-path', async (_event, filePath: string) => {
    await shell.openPath(filePath);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

// Security: prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
