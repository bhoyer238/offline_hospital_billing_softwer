import { ipcMain } from 'electron';
import { requireSession } from './auth.ipc';
import {
  getDailyCollectionReport, getMonthlyCollectionReport, getPendingPaymentReport,
  getServiceRevenueReport, getDoctorRevenueReport, getPatientReport, getIpdReport, getOpdReport, getCancelledBillReport
} from '../database/repositories/reports.repo';
import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { getAppDataPath } from '../database/db';

function arrayToCsv(data: Array<Record<string, unknown>>): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function registerReportsIpc(): void {
  ipcMain.handle('reports:daily-collection', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getDailyCollectionReport(dateFrom, dateTo) }; } catch (e: unknown) { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:monthly-collection', async (_event, year: number) => {
    try { requireSession(); return { success: true, data: getMonthlyCollectionReport(year) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:pending-payments', async (_event, { dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
    try { requireSession(); return { success: true, data: getPendingPaymentReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:service-revenue', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getServiceRevenueReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:doctor-revenue', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getDoctorRevenueReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:patients', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getPatientReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:ipd', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getIpdReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:opd', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getOpdReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });
  ipcMain.handle('reports:cancelled-bills', async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
    try { requireSession(); return { success: true, data: getCancelledBillReport(dateFrom, dateTo) }; } catch { return { success: false, data: [] }; }
  });

  ipcMain.handle('reports:export-csv', async (_event, { data, filename }: { data: Array<Record<string, unknown>>; filename: string }) => {
    try {
      requireSession();
      const result = await dialog.showSaveDialog({
        title: 'Export Report',
        defaultPath: path.join(getAppDataPath(), 'exports', filename),
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });

      if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' };

      const csv = arrayToCsv(data);
      fs.writeFileSync(result.filePath, '\ufeff' + csv, 'utf-8'); // BOM for Excel
      return { success: true, filePath: result.filePath };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Export failed' };
    }
  });
}
