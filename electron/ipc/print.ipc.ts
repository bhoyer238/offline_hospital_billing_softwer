import { ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { requireSession } from './auth.ipc';
import { getBill } from '../database/repositories/billing.repo';
import { getHospitalSettings } from '../database/repositories/settings.repo';
import { addAuditLog } from '../database/repositories/audit.repo';
import { getAppDataPath } from '../database/db';

export function registerPrintIpc(_mainWin: BrowserWindow | null): void {
  ipcMain.handle('print:bill', async (_event, billId: number) => {
    try {
      const session = requireSession();
      const bill = getBill(billId);
      if (!bill) return { success: false, error: 'Bill not found' };
      const settings = getHospitalSettings();
      addAuditLog({ user_id: session.userId, username: session.username, action: 'PRINT', module: 'Billing', record_id: billId, description: `Bill printed: ${bill.bill_number}` });
      return { success: true, bill, settings };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('print:save-pdf', async (_event, billId: number) => {
    try {
      const session = requireSession();
      const bill = getBill(billId);
      if (!bill) return { success: false, error: 'Bill not found' };
      const saveResult = await dialog.showSaveDialog({
        title: 'Save Bill as PDF',
        defaultPath: path.join(getAppDataPath(), 'exports', `Bill_${bill.bill_number.replace(/\//g, '-')}.pdf`),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (saveResult.canceled || !saveResult.filePath) return { success: false, error: 'Cancelled' };
      addAuditLog({ user_id: session.userId, username: session.username, action: 'SAVE_PDF', module: 'Billing', record_id: billId, description: `PDF saved for bill: ${bill.bill_number}` });
      return { success: true, bill, filePath: saveResult.filePath, settings: getHospitalSettings() };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  /**
   * print:html-content
   * Receives a complete HTML string from the renderer.
   * Opens a hidden BrowserWindow, loads the HTML, prints/saves-as-PDF, then closes.
   */
  ipcMain.handle('print:html-content', async (_event, htmlContent: string, savePdfPath?: string) => {
    try {
      requireSession();

      // Write HTML to a temp file (file:// protocol loads resources better than loadURL data:)
      const tmpFile = path.join(os.tmpdir(), `hospital-bill-${Date.now()}.html`);
      fs.writeFileSync(tmpFile, htmlContent, 'utf-8');

      const win = new BrowserWindow({
        show: false,
        width: 794,  // A4 width at 96 DPI (210mm) — exact match avoids scaling gap
        height: 1123, // A4 height at 96 DPI (297mm)
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      await win.loadFile(tmpFile);

      // Give the page a moment to render fonts/images
      await new Promise(r => setTimeout(r, 800));

      let result: { success: boolean; error?: string; filePath?: string };

      if (savePdfPath) {
        // Save as PDF to specific path — margins handled by CSS @page rule in the HTML
        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { marginType: 'none' },
        });

        // Ensure directory exists
        const dir = path.dirname(savePdfPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(savePdfPath, pdfData);
        result = { success: true, filePath: savePdfPath };
      } else {
        // No specific path → save to temp file and open with system default PDF viewer.
        // This avoids Electron's "doesn't support print preview" limitation.
        // User can preview and print from their PDF reader (e.g. Adobe, browser).
        const { shell } = await import('electron');
        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { marginType: 'none' },
        });
        const tempPdfPath = path.join(os.tmpdir(), `hospital-bill-print-${Date.now()}.pdf`);
        fs.writeFileSync(tempPdfPath, pdfData);
        // Open with system default viewer (browser, Adobe Reader, etc.)
        await shell.openPath(tempPdfPath);
        result = { success: true, filePath: tempPdfPath };
      }

      win.close();
      try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Print failed' };
    }
  });

  // Legacy handler — kept for backward compat
  ipcMain.handle('print:content', async (event, _htmlContent: string) => {
    try {
      requireSession();
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { success: false, error: 'Window not found' };
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        win.webContents.print(
          { silent: false, printBackground: true, margins: { marginType: 'none' } },
          (success, errorType) => { resolve(success ? { success: true } : { success: false, error: errorType }); }
        );
      });
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Print failed' };
    }
  });
}
