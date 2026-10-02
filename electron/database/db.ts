import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getAppDataPath(): string {
  const appData = app.getPath('userData');
  const appDir = path.join(appData, 'HospitalBilling');
  
  const dirs = [
    path.join(appDir, 'database'),
    path.join(appDir, 'backups'),
    path.join(appDir, 'logs'),
    path.join(appDir, 'uploads', 'logos'),
    path.join(appDir, 'exports'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return appDir;
}

export function getDatabasePath(): string {
  const appDir = getAppDataPath();
  return path.join(appDir, 'database', 'hospital.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  
  db = new Database(dbPath);

  // Performance and safety pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 268435456'); // 256MB mmap

  runMigrations(db);
  
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function checkDatabaseIntegrity(): { ok: boolean; error?: string } {
  try {
    const result = getDatabase().pragma('integrity_check') as Array<{ integrity_check: string }>;
    const ok = result.length === 1 && result[0].integrity_check === 'ok';
    return { ok, error: ok ? undefined : result.map(r => r.integrity_check).join(', ') };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function runMigrations(database: Database.Database): void {
  // Create migrations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  const appliedVersions = (database.prepare('SELECT version FROM migrations ORDER BY version').all() as Array<{ version: number }>).map(r => r.version);

  const migrations = getMigrations();
  
  for (const migration of migrations) {
    if (!appliedVersions.includes(migration.version)) {
      const applyMigration = database.transaction(() => {
        database.exec(migration.sql);
        database.prepare('INSERT INTO migrations (version) VALUES (?)').run(migration.version);
      });
      applyMigration();
      console.log(`Applied migration v${migration.version}`);
    }
  }
}

function getMigrations(): Array<{ version: number; sql: string }> {
  return [
    {
      version: 1,
      sql: `
        -- App Configuration
        CREATE TABLE IF NOT EXISTS app_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        -- Roles
        CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          description TEXT
        );

        INSERT OR IGNORE INTO roles (name, display_name, description) VALUES
          ('admin', 'Administrator', 'Full system access'),
          ('receptionist', 'Receptionist', 'Patient registration and billing');

        -- Users
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role_id INTEGER NOT NULL REFERENCES roles(id),
          is_active INTEGER NOT NULL DEFAULT 1,
          last_login TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          created_by INTEGER REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

        -- Hospital Settings
        CREATE TABLE IF NOT EXISTS hospital_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          hospital_name TEXT NOT NULL DEFAULT 'My Hospital',
          address TEXT,
          city TEXT,
          taluka TEXT,
          district TEXT,
          pin_code TEXT,
          phone TEXT,
          email TEXT,
          registration_number TEXT,
          gst_number TEXT,
          website TEXT,
          logo_path TEXT,
          currency TEXT NOT NULL DEFAULT 'INR',
          currency_symbol TEXT NOT NULL DEFAULT '₹',
          bill_prefix TEXT NOT NULL DEFAULT 'IPDR',
          opd_prefix TEXT NOT NULL DEFAULT 'OPD',
          receipt_prefix TEXT NOT NULL DEFAULT 'RCPT',
          uhid_prefix TEXT NOT NULL DEFAULT 'UHID',
          ipd_prefix TEXT NOT NULL DEFAULT 'IPD',
          tax_enabled INTEGER NOT NULL DEFAULT 0,
          tax_rate INTEGER NOT NULL DEFAULT 0,
          paper_size TEXT NOT NULL DEFAULT 'A4',
          footer_text TEXT,
          terms_conditions TEXT,
          session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
          auto_backup INTEGER NOT NULL DEFAULT 1,
          backup_copies INTEGER NOT NULL DEFAULT 10,
          show_reprint_stamp INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        INSERT OR IGNORE INTO hospital_settings (id) VALUES (1);

        -- Departments
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          is_active INTEGER NOT NULL DEFAULT 1
        );

        INSERT OR IGNORE INTO departments (name) VALUES 
          ('General Medicine'), ('Surgery'), ('Pediatrics'), ('Gynecology'),
          ('Orthopedics'), ('Cardiology'), ('Neurology'), ('ICU'),
          ('ENT'), ('Ophthalmology'), ('Dermatology'), ('Psychiatry'), ('Emergency');

        -- Doctors
        CREATE TABLE IF NOT EXISTS doctors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_name TEXT NOT NULL,
          specialization TEXT,
          department_id INTEGER REFERENCES departments(id),
          registration_number TEXT,
          mobile TEXT,
          email TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(doctor_name);

        -- Rooms
        CREATE TABLE IF NOT EXISTS rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_number TEXT NOT NULL UNIQUE,
          room_type TEXT NOT NULL DEFAULT 'General',
          floor TEXT,
          department_id INTEGER REFERENCES departments(id),
          is_active INTEGER NOT NULL DEFAULT 1
        );

        -- Beds
        CREATE TABLE IF NOT EXISTS beds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bed_number TEXT NOT NULL,
          room_id INTEGER NOT NULL REFERENCES rooms(id),
          is_occupied INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          UNIQUE(bed_number, room_id)
        );

        -- Patients
        CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uhid TEXT NOT NULL UNIQUE,
          registration_number TEXT,
          patient_name TEXT NOT NULL,
          father_husband_name TEXT,
          date_of_birth TEXT,
          age INTEGER,
          age_unit TEXT DEFAULT 'years',
          gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
          blood_group TEXT,
          mobile TEXT,
          mobile2 TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          taluka TEXT,
          district TEXT,
          pin_code TEXT,
          emergency_contact_name TEXT,
          emergency_contact_mobile TEXT,
          doctor_id INTEGER REFERENCES doctors(id),
          department_id INTEGER REFERENCES departments(id),
          insurance_name TEXT,
          policy_number TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          created_by INTEGER REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
        CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(patient_name);
        CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);

        -- UHID Sequence
        CREATE TABLE IF NOT EXISTS uhid_sequence (
          year INTEGER NOT NULL,
          last_number INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(year)
        );

        -- Service Categories
        CREATE TABLE IF NOT EXISTS service_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1
        );

        INSERT OR IGNORE INTO service_categories (name, sort_order) VALUES
          ('Administration', 1), ('Room Charges', 2), ('ICU', 3), ('Consultation', 4),
          ('Nursing', 5), ('Laboratory', 6), ('Radiology', 7), ('Pharmacy', 8),
          ('Operation', 9), ('ECG', 10), ('Physiotherapy', 11), ('Other', 12);

        -- Services
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service_name TEXT NOT NULL,
          category_id INTEGER NOT NULL REFERENCES service_categories(id),
          rate INTEGER NOT NULL DEFAULT 0,
          unit TEXT NOT NULL DEFAULT 'per visit',
          tax_applicable INTEGER NOT NULL DEFAULT 0,
          description TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_services_name ON services(service_name);
        CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);

        -- OPD Sequence
        CREATE TABLE IF NOT EXISTS opd_sequence (
          year INTEGER NOT NULL,
          last_number INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(year)
        );

        -- OPD Visits
        CREATE TABLE IF NOT EXISTS opd_visits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          opd_number TEXT NOT NULL UNIQUE,
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          doctor_id INTEGER REFERENCES doctors(id),
          department_id INTEGER REFERENCES departments(id),
          visit_date TEXT NOT NULL,
          visit_time TEXT,
          consultation_fee INTEGER NOT NULL DEFAULT 0,
          other_charges INTEGER NOT NULL DEFAULT 0,
          discount INTEGER NOT NULL DEFAULT 0,
          total INTEGER NOT NULL DEFAULT 0,
          payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK(payment_status IN ('Paid', 'Partially Paid', 'Pending')),
          payment_mode TEXT DEFAULT 'Cash',
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          created_by INTEGER REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_opd_patient ON opd_visits(patient_id);
        CREATE INDEX IF NOT EXISTS idx_opd_date ON opd_visits(visit_date);
        CREATE INDEX IF NOT EXISTS idx_opd_number ON opd_visits(opd_number);

        -- IPD Sequence
        CREATE TABLE IF NOT EXISTS ipd_sequence (
          year INTEGER NOT NULL,
          last_number INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(year)
        );

        -- IPD Admissions
        CREATE TABLE IF NOT EXISTS ipd_admissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ipd_number TEXT NOT NULL UNIQUE,
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          admission_date TEXT NOT NULL,
          admission_time TEXT,
          discharge_date TEXT,
          discharge_time TEXT,
          doctor_id INTEGER REFERENCES doctors(id),
          department_id INTEGER REFERENCES departments(id),
          room_id INTEGER REFERENCES rooms(id),
          bed_id INTEGER REFERENCES beds(id),
          diagnosis TEXT,
          tpa_name TEXT,
          claim_number TEXT,
          policy_name TEXT,
          policy_number TEXT,
          insurance_details TEXT,
          category TEXT DEFAULT 'General',
          status TEXT NOT NULL DEFAULT 'Admitted' CHECK(status IN ('Admitted', 'Discharged', 'Cancelled')),
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          created_by INTEGER REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_ipd_patient ON ipd_admissions(patient_id);
        CREATE INDEX IF NOT EXISTS idx_ipd_date ON ipd_admissions(admission_date);
        CREATE INDEX IF NOT EXISTS idx_ipd_number ON ipd_admissions(ipd_number);
        CREATE INDEX IF NOT EXISTS idx_ipd_status ON ipd_admissions(status);

        -- Bill Sequences
        CREATE TABLE IF NOT EXISTS bill_sequences (
          year INTEGER NOT NULL,
          bill_type TEXT NOT NULL,
          last_number INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(year, bill_type)
        );

        -- Bills
        CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_number TEXT NOT NULL UNIQUE,
          bill_type TEXT NOT NULL DEFAULT 'IPD' CHECK(bill_type IN ('IPD', 'OPD')),
          bill_date TEXT NOT NULL,
          bill_time TEXT NOT NULL,
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          ipd_id INTEGER REFERENCES ipd_admissions(id),
          opd_id INTEGER REFERENCES opd_visits(id),
          doctor_id INTEGER REFERENCES doctors(id),
          subtotal INTEGER NOT NULL DEFAULT 0,
          discount_amount INTEGER NOT NULL DEFAULT 0,
          discount_percent INTEGER NOT NULL DEFAULT 0,
          tax_amount INTEGER NOT NULL DEFAULT 0,
          net_amount INTEGER NOT NULL DEFAULT 0,
          paid_amount INTEGER NOT NULL DEFAULT 0,
          balance_amount INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Finalized', 'Cancelled')),
          cancelled_by INTEGER REFERENCES users(id),
          cancelled_at TEXT,
          cancellation_reason TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          created_by INTEGER REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
        CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
        CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
        CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
        CREATE INDEX IF NOT EXISTS idx_bills_ipd ON bills(ipd_id);

        -- Bill Items
        CREATE TABLE IF NOT EXISTS bill_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
          service_id INTEGER REFERENCES services(id),
          service_name TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          rate INTEGER NOT NULL DEFAULT 0,
          amount INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          sort_order INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);

        -- Receipt Sequence
        CREATE TABLE IF NOT EXISTS receipt_sequence (
          year INTEGER NOT NULL,
          last_number INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(year)
        );

        -- Payments
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receipt_number TEXT NOT NULL UNIQUE,
          bill_id INTEGER NOT NULL REFERENCES bills(id),
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          amount INTEGER NOT NULL,
          payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK(payment_mode IN ('Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Other')),
          payment_date TEXT NOT NULL,
          payment_time TEXT NOT NULL,
          cheque_number TEXT,
          bank_name TEXT,
          transaction_id TEXT,
          notes TEXT,
          received_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
        CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

        -- Audit Logs
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id),
          username TEXT,
          action TEXT NOT NULL,
          module TEXT NOT NULL,
          record_id INTEGER,
          description TEXT,
          ip_address TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
      `,
    },
    {
      version: 2,
      sql: `
        -- Insert default services
        INSERT OR IGNORE INTO services (service_name, category_id, rate, unit) VALUES
          ('Administration Charges', 1, 50000, 'per admission'),
          ('Bio-Medical Waste Charges', 1, 150000, 'per admission'),
          ('ICU Charges', 3, 900000, 'per day'),
          ('ICU Consultation Charges', 3, 150000, 'per day'),
          ('Private AC Room Charges', 2, 500000, 'per day'),
          ('Private Room Charges', 2, 300000, 'per day'),
          ('General Ward Charges', 2, 100000, 'per day'),
          ('Private AC Room Consultation', 4, 100000, 'per day'),
          ('ECG Charges', 9, 30000, 'per test'),
          ('Doctor Visit Charges', 4, 50000, 'per visit'),
          ('Nursing Charges', 5, 200000, 'per day'),
          ('Pharmacy Charges', 8, 0, 'per bill'),
          ('Laboratory Charges', 6, 0, 'per test'),
          ('Radiology Charges', 7, 0, 'per test'),
          ('Operation Charges', 9, 0, 'as applicable'),
          ('Physiotherapy Charges', 11, 50000, 'per session'),
          ('Ambulance Charges', 12, 100000, 'per trip'),
          ('Other Charges', 12, 0, 'as applicable');
      `,
    },
  ];
}
