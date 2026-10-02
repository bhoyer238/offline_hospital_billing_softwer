// ============================================================
// SHARED TYPES
// ============================================================

export interface User {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: 'admin' | 'receptionist';
  is_active: number;
  last_login: string | null;
  created_at: string;
}

export interface HospitalSettings {
  id: number;
  hospital_name: string;
  address: string | null;
  city: string | null;
  taluka: string | null;
  district: string | null;
  pin_code: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  gst_number: string | null;
  website: string | null;
  logo_path: string | null;
  currency: string;
  currency_symbol: string;
  bill_prefix: string;
  opd_prefix: string;
  receipt_prefix: string;
  uhid_prefix: string;
  ipd_prefix: string;
  tax_enabled: number;
  tax_rate: number;
  paper_size: string;
  footer_text: string | null;
  terms_conditions: string | null;
  session_timeout_minutes: number;
  auto_backup: number;
  backup_copies: number;
  show_reprint_stamp: number;
}

export interface Patient {
  id: number;
  uhid: string;
  registration_number: string | null;
  patient_name: string;
  father_husband_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  age_unit: string;
  gender: 'Male' | 'Female' | 'Other';
  blood_group: string | null;
  mobile: string | null;
  mobile2: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  taluka: string | null;
  district: string | null;
  pin_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_mobile: string | null;
  doctor_id: number | null;
  department_id: number | null;
  insurance_name: string | null;
  policy_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  doctor_name?: string;
  department_name?: string;
}

export interface Doctor {
  id: number;
  doctor_name: string;
  specialization: string | null;
  department_id: number | null;
  registration_number: string | null;
  mobile: string | null;
  email: string | null;
  is_active: number;
  department_name?: string;
}

export interface Department {
  id: number;
  name: string;
  is_active: number;
}

export interface Service {
  id: number;
  service_name: string;
  category_id: number;
  rate: number;
  unit: string;
  tax_applicable: number;
  description: string | null;
  is_active: number;
  category_name?: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  sort_order: number;
  is_active: number;
}

export interface OpdVisit {
  id: number;
  opd_number: string;
  patient_id: number;
  doctor_id: number | null;
  department_id: number | null;
  visit_date: string;
  visit_time: string | null;
  consultation_fee: number;
  other_charges: number;
  discount: number;
  total: number;
  payment_status: string;
  payment_mode: string | null;
  notes: string | null;
  created_at: string;
  patient_name?: string;
  uhid?: string;
  doctor_name?: string;
  department_name?: string;
}

export interface IpdAdmission {
  id: number;
  ipd_number: string;
  patient_id: number;
  admission_date: string;
  admission_time: string | null;
  discharge_date: string | null;
  discharge_time: string | null;
  doctor_id: number | null;
  department_id: number | null;
  room_id: number | null;
  bed_id: number | null;
  diagnosis: string | null;
  tpa_name: string | null;
  claim_number: string | null;
  policy_name: string | null;
  policy_number: string | null;
  insurance_details: string | null;
  category: string;
  status: 'Admitted' | 'Discharged' | 'Cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  uhid?: string;
  mobile?: string;
  doctor_name?: string;
  department_name?: string;
  room_number?: string;
  bed_number?: string;
  age?: number;
  age_unit?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
}

export interface BillItem {
  id?: number;
  bill_id?: number;
  service_id: number | null;
  service_name: string;
  quantity: number;
  rate: number;
  amount: number;
  notes: string | null;
  sort_order: number;
}

export interface Bill {
  id: number;
  bill_number: string;
  bill_type: 'IPD' | 'OPD';
  bill_date: string;
  bill_time: string;
  patient_id: number;
  ipd_id: number | null;
  opd_id: number | null;
  doctor_id: number | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'Draft' | 'Finalized' | 'Cancelled';
  cancelled_by: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  patient_name?: string;
  uhid?: string;
  mobile?: string;
  age?: number;
  age_unit?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
  doctor_name?: string;
  ipd_number?: string;
  opd_number?: string;
  admission_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  tpa_name?: string;
  claim_number?: string;
  policy_name?: string;
  category?: string;
  items?: BillItem[];
}

export interface Payment {
  id: number;
  receipt_number: string;
  bill_id: number;
  patient_id: number;
  amount: number;
  payment_mode: string;
  payment_date: string;
  payment_time: string;
  cheque_number: string | null;
  bank_name: string | null;
  transaction_id: string | null;
  notes: string | null;
  received_by: number | null;
  created_at: string;
  receiver_name?: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  module: string;
  record_id: number | null;
  description: string | null;
  created_at: string;
}

export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';
export type BillType = 'IPD' | 'OPD';
export type IpdStatus = 'Admitted' | 'Discharged' | 'Cancelled';
export type Gender = 'Male' | 'Female' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// API type - typed interface to window.api
export interface WindowAPI {
  auth: {
    login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
    logout: () => Promise<{ success: boolean }>;
    isSetupComplete: () => Promise<{ complete: boolean }>;
    setupAdmin: (data: object) => Promise<{ success: boolean; error?: string }>;
    changePassword: (userId: number, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  };
  patients: {
    create: (data: object) => Promise<{ success: boolean; id?: number; uhid?: string; error?: string }>;
    update: (id: number, data: object) => Promise<{ success: boolean; error?: string }>;
    get: (id: number) => Promise<{ success: boolean; patient?: Patient; error?: string }>;
    search: (query: string, limit?: number, offset?: number) => Promise<{ patients: Patient[]; total: number }>;
    getCount: () => Promise<{ count: number }>;
  };
  opd: {
    create: (data: object) => Promise<{ success: boolean; id?: number; opd_number?: string; error?: string }>;
    getAll: (patientId?: number, limit?: number, offset?: number) => Promise<{ visits: OpdVisit[]; total: number }>;
    getTodayCount: () => Promise<{ count: number }>;
  };
  ipd: {
    create: (data: object) => Promise<{ success: boolean; id?: number; ipd_number?: string; error?: string }>;
    update: (id: number, data: object) => Promise<{ success: boolean; error?: string }>;
    get: (id: number) => Promise<{ success: boolean; admission?: IpdAdmission; error?: string }>;
    getAll: (filters: object, limit?: number, offset?: number) => Promise<{ admissions: IpdAdmission[]; total: number }>;
    getTodayCount: () => Promise<{ count: number }>;
    getAdmittedCount: () => Promise<{ count: number }>;
  };
  billing: {
    createBill: (data: object) => Promise<{ success: boolean; bill?: Bill; error?: string }>;
    updateBill: (id: number, data: object) => Promise<{ success: boolean; bill?: Bill; error?: string }>;
    getBill: (id: number) => Promise<{ success: boolean; bill?: Bill; error?: string }>;
    getBillByNumber: (billNumber: string) => Promise<{ success: boolean; bill?: Bill; error?: string }>;
    searchBills: (query: string, filters: object, limit?: number, offset?: number) => Promise<{ bills: Bill[]; total: number }>;
    cancelBill: (billId: number, reason: string) => Promise<{ success: boolean; error?: string }>;
    addPayment: (data: object) => Promise<{ success: boolean; receipt_number?: string; error?: string }>;
    getBillPayments: (billId: number) => Promise<{ success: boolean; payments: Payment[] }>;
    getTodayCollection: () => Promise<{ amount: number }>;
    getTodayBillCount: () => Promise<{ count: number }>;
    getPendingPayments: () => Promise<{ amount: number }>;
    getTotalRevenue: () => Promise<{ amount: number }>;
    getDailyRevenue: (days?: number) => Promise<{ data: Array<{ date: string; amount: number }> }>;
    getPaymentModeBreakdown: () => Promise<{ data: Array<{ payment_mode: string; amount: number }> }>;
    getServiceRevenue: () => Promise<{ data: Array<{ service_name: string; total: number; count: number }> }>;
  };
  services: {
    getAll: (activeOnly?: boolean) => Promise<{ success: boolean; services: Service[] }>;
    search: (query: string) => Promise<{ success: boolean; services: Service[] }>;
    create: (data: object) => Promise<{ success: boolean; id?: number; error?: string }>;
    update: (id: number, data: object) => Promise<{ success: boolean; error?: string }>;
    getCategories: () => Promise<{ success: boolean; categories: ServiceCategory[] }>;
  };
  doctors: {
    getAll: (activeOnly?: boolean) => Promise<{ success: boolean; doctors: Doctor[] }>;
    create: (data: object) => Promise<{ success: boolean; id?: number; error?: string }>;
    update: (id: number, data: object) => Promise<{ success: boolean; error?: string }>;
    getDepartments: () => Promise<{ success: boolean; departments: Department[] }>;
  };
  users: {
    getAll: () => Promise<{ success: boolean; users: User[] }>;
    create: (data: object) => Promise<{ success: boolean; id?: number; error?: string }>;
    update: (id: number, data: object) => Promise<{ success: boolean; error?: string }>;
    toggleStatus: (id: number, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
    resetPassword: (id: number, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    getRoles: () => Promise<{ success: boolean; roles: Array<{ id: number; name: string; display_name: string }> }>;
  };
  settings: {
    get: () => Promise<{ success: boolean; settings: HospitalSettings }>;
    update: (data: object) => Promise<{ success: boolean; error?: string }>;
    uploadLogo: () => Promise<{ success: boolean; logoPath?: string; base64?: string; error?: string }>;
    readLogo: (logoPath: string) => Promise<{ success: boolean; base64?: string }>;
  };
  reports: {
    dailyCollection: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    monthlyCollection: (year: number) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    pendingPayments: (dateFrom?: string, dateTo?: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    serviceRevenue: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    doctorRevenue: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    patients: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    ipd: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    opd: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    cancelledBills: (dateFrom: string, dateTo: string) => Promise<{ success: boolean; data: Record<string, unknown>[] }>;
    exportCsv: (data: Record<string, unknown>[], filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  backup: {
    create: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    restore: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    selectFile: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    listBackups: () => Promise<{ success: boolean; files: Array<{ name: string; path: string; size: number; created: Date }> }>;
  };
  audit: {
    getLogs: (filters: object, limit?: number, offset?: number) => Promise<{ logs: AuditLog[]; total: number }>;
    addLog: (data: object) => Promise<{ success: boolean }>;
  };
  print: {
    printBill: (billId: number) => Promise<{ success: boolean; bill?: Bill; settings?: HospitalSettings; error?: string }>;
    savePdf: (billId: number) => Promise<{ success: boolean; bill?: Bill; filePath?: string; settings?: HospitalSettings; error?: string }>;
    printContent: (content: string) => Promise<{ success: boolean; error?: string }>;
    printHtmlContent: (html: string, savePdfPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  app: {
    getPaths: () => Promise<{ userData: string; appData: string; documents: string }>;
    openPath: (filePath: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    api: WindowAPI;
  }
}
