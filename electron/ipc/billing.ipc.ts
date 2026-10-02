import { ipcMain } from 'electron';
import { requireSession, requireAdmin } from './auth.ipc';
import {
  createBill, updateBill, getBill, getBillByNumber, searchBills, cancelBill,
  addPayment, getBillPayments, getTodayCollection, getTodayBillCount,
  getPendingPayments, getTotalRevenue, getDailyRevenue, getPaymentModeBreakdown, getServiceRevenue
} from '../database/repositories/billing.repo';
import { addAuditLog } from '../database/repositories/audit.repo';

export function registerBillingIpc(): void {
  ipcMain.handle('billing:create-bill', async (_event, data: object) => {
    try {
      const session = requireSession();
      const billData = { ...(data as Parameters<typeof createBill>[0]), created_by: session.userId };
      const result = createBill(billData);
      if (result.success && result.bill) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'CREATE', module: 'Billing', record_id: result.bill.id, description: `Bill created: ${result.bill.bill_number}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create bill' };
    }
  });

  ipcMain.handle('billing:update-bill', async (_event, { id, data }: { id: number; data: object }) => {
    try {
      const session = requireSession();
      const result = updateBill(id, data as Parameters<typeof updateBill>[1]);
      if (result.success && result.bill) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'UPDATE', module: 'Billing', record_id: id, description: `Bill updated: ${result.bill.bill_number}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update bill' };
    }
  });

  ipcMain.handle('billing:get-bill', async (_event, id: number) => {
    try {
      requireSession();
      return { success: true, bill: getBill(id) };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('billing:get-bill-by-number', async (_event, billNumber: string) => {
    try {
      requireSession();
      return { success: true, bill: getBillByNumber(billNumber) };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('billing:search-bills', async (_event, { query, filters, limit, offset }: { query: string; filters: object; limit?: number; offset?: number }) => {
    try {
      requireSession();
      return searchBills(query || '', filters as Parameters<typeof searchBills>[1], limit, offset);
    } catch { return { bills: [], total: 0 }; }
  });

  ipcMain.handle('billing:cancel-bill', async (_event, { billId, reason }: { billId: number; reason: string }) => {
    try {
      const session = requireAdmin(); // Only admin can cancel bills
      const result = cancelBill(billId, reason, session.userId);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'CANCEL', module: 'Billing', record_id: billId, description: `Bill cancelled. Reason: ${reason}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('billing:add-payment', async (_event, data: object) => {
    try {
      const session = requireSession();
      const paymentData = { ...(data as Parameters<typeof addPayment>[0]), received_by: session.userId };
      const result = addPayment(paymentData);
      if (result.success) {
        addAuditLog({ user_id: session.userId, username: session.username, action: 'PAYMENT', module: 'Billing', description: `Payment recorded: ${result.receipt_number}` });
      }
      return result;
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed' };
    }
  });

  ipcMain.handle('billing:get-payments', async (_event, billId: number) => {
    try {
      requireSession();
      return { success: true, payments: getBillPayments(billId) };
    } catch (e: unknown) {
      return { success: false, payments: [] };
    }
  });

  ipcMain.handle('billing:today-collection', async () => {
    try { requireSession(); return { amount: getTodayCollection() }; } catch { return { amount: 0 }; }
  });
  ipcMain.handle('billing:today-bill-count', async () => {
    try { requireSession(); return { count: getTodayBillCount() }; } catch { return { count: 0 }; }
  });
  ipcMain.handle('billing:pending-payments', async () => {
    try { requireSession(); return { amount: getPendingPayments() }; } catch { return { amount: 0 }; }
  });
  ipcMain.handle('billing:total-revenue', async () => {
    try { requireSession(); return { amount: getTotalRevenue() }; } catch { return { amount: 0 }; }
  });
  ipcMain.handle('billing:daily-revenue', async (_event, days?: number) => {
    try { requireSession(); return { data: getDailyRevenue(days) }; } catch { return { data: [] }; }
  });
  ipcMain.handle('billing:payment-mode-breakdown', async () => {
    try { requireSession(); return { data: getPaymentModeBreakdown() }; } catch { return { data: [] }; }
  });
  ipcMain.handle('billing:service-revenue', async () => {
    try { requireSession(); return { data: getServiceRevenue() }; } catch { return { data: [] }; }
  });
}
