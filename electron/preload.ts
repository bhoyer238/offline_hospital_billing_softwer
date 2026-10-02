import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, typed IPC API to renderer
const api = {
  // Auth
  auth: {
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', { username, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    isSetupComplete: () => ipcRenderer.invoke('auth:is-setup-complete'),
    setupAdmin: (data: object) => ipcRenderer.invoke('auth:setup-admin', data),
    changePassword: (userId: number, newPassword: string) => ipcRenderer.invoke('auth:change-password', { userId, newPassword }),
  },

  // Patients
  patients: {
    create: (data: object) => ipcRenderer.invoke('patients:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('patients:update', { id, data }),
    get: (id: number) => ipcRenderer.invoke('patients:get', id),
    search: (query: string, limit?: number, offset?: number) => ipcRenderer.invoke('patients:search', { query, limit, offset }),
    getCount: () => ipcRenderer.invoke('patients:get-count'),
  },

  // OPD
  opd: {
    create: (data: object) => ipcRenderer.invoke('opd:create', data),
    getAll: (patientId?: number, limit?: number, offset?: number) => ipcRenderer.invoke('opd:get-all', { patientId, limit, offset }),
    getTodayCount: () => ipcRenderer.invoke('opd:today-count'),
  },

  // IPD
  ipd: {
    create: (data: object) => ipcRenderer.invoke('ipd:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('ipd:update', { id, data }),
    get: (id: number) => ipcRenderer.invoke('ipd:get', id),
    getAll: (filters: object, limit?: number, offset?: number) => ipcRenderer.invoke('ipd:get-all', { filters, limit, offset }),
    getTodayCount: () => ipcRenderer.invoke('ipd:today-count'),
    getAdmittedCount: () => ipcRenderer.invoke('ipd:admitted-count'),
  },

  // Billing
  billing: {
    createBill: (data: object) => ipcRenderer.invoke('billing:create-bill', data),
    updateBill: (id: number, data: object) => ipcRenderer.invoke('billing:update-bill', { id, data }),
    getBill: (id: number) => ipcRenderer.invoke('billing:get-bill', id),
    getBillByNumber: (billNumber: string) => ipcRenderer.invoke('billing:get-bill-by-number', billNumber),
    searchBills: (query: string, filters: object, limit?: number, offset?: number) => ipcRenderer.invoke('billing:search-bills', { query, filters, limit, offset }),
    cancelBill: (billId: number, reason: string) => ipcRenderer.invoke('billing:cancel-bill', { billId, reason }),
    addPayment: (data: object) => ipcRenderer.invoke('billing:add-payment', data),
    getBillPayments: (billId: number) => ipcRenderer.invoke('billing:get-payments', billId),
    getTodayCollection: () => ipcRenderer.invoke('billing:today-collection'),
    getTodayBillCount: () => ipcRenderer.invoke('billing:today-bill-count'),
    getPendingPayments: () => ipcRenderer.invoke('billing:pending-payments'),
    getTotalRevenue: () => ipcRenderer.invoke('billing:total-revenue'),
    getDailyRevenue: (days?: number) => ipcRenderer.invoke('billing:daily-revenue', days),
    getPaymentModeBreakdown: () => ipcRenderer.invoke('billing:payment-mode-breakdown'),
    getServiceRevenue: () => ipcRenderer.invoke('billing:service-revenue'),
  },

  // Services
  services: {
    getAll: (activeOnly?: boolean) => ipcRenderer.invoke('services:get-all', activeOnly),
    search: (query: string) => ipcRenderer.invoke('services:search', query),
    create: (data: object) => ipcRenderer.invoke('services:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('services:update', { id, data }),
    getCategories: () => ipcRenderer.invoke('services:get-categories'),
  },

  // Doctors
  doctors: {
    getAll: (activeOnly?: boolean) => ipcRenderer.invoke('doctors:get-all', activeOnly),
    create: (data: object) => ipcRenderer.invoke('doctors:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('doctors:update', { id, data }),
    getDepartments: () => ipcRenderer.invoke('doctors:get-departments'),
  },

  // Users
  users: {
    getAll: () => ipcRenderer.invoke('users:get-all'),
    create: (data: object) => ipcRenderer.invoke('users:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('users:update', { id, data }),
    toggleStatus: (id: number, isActive: boolean) => ipcRenderer.invoke('users:toggle-status', { id, isActive }),
    resetPassword: (id: number, newPassword: string) => ipcRenderer.invoke('users:reset-password', { id, newPassword }),
    getRoles: () => ipcRenderer.invoke('users:get-roles'),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data: object) => ipcRenderer.invoke('settings:update', data),
    uploadLogo: () => ipcRenderer.invoke('settings:upload-logo'),
    readLogo: (logoPath: string) => ipcRenderer.invoke('settings:read-logo', logoPath),
  },

  // Reports
  reports: {
    dailyCollection: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:daily-collection', { dateFrom, dateTo }),
    monthlyCollection: (year: number) => ipcRenderer.invoke('reports:monthly-collection', year),
    pendingPayments: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('reports:pending-payments', { dateFrom, dateTo }),
    serviceRevenue: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:service-revenue', { dateFrom, dateTo }),
    doctorRevenue: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:doctor-revenue', { dateFrom, dateTo }),
    patients: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:patients', { dateFrom, dateTo }),
    ipd: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:ipd', { dateFrom, dateTo }),
    opd: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:opd', { dateFrom, dateTo }),
    cancelledBills: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:cancelled-bills', { dateFrom, dateTo }),
    exportCsv: (data: object[], filename: string) => ipcRenderer.invoke('reports:export-csv', { data, filename }),
  },

  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
    selectFile: () => ipcRenderer.invoke('backup:select-file'),
    listBackups: () => ipcRenderer.invoke('backup:list'),
  },

  // Audit
  audit: {
    getLogs: (filters: object, limit?: number, offset?: number) => ipcRenderer.invoke('audit:get-logs', { filters, limit, offset }),
    addLog: (data: object) => ipcRenderer.invoke('audit:add-log', data),
  },

  // Print
  print: {
    printBill: (billId: number) => ipcRenderer.invoke('print:bill', billId),
    savePdf: (billId: number) => ipcRenderer.invoke('print:save-pdf', billId),
    printContent: (content: string) => ipcRenderer.invoke('print:content', content),
    printHtmlContent: (html: string, savePdfPath?: string) => ipcRenderer.invoke('print:html-content', html, savePdfPath),
  },

  // App
  app: {
    getPaths: () => ipcRenderer.invoke('app:get-paths'),
    openPath: (filePath: string) => ipcRenderer.invoke('app:open-path', filePath),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type API = typeof api;
