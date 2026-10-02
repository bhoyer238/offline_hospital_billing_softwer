import { getDatabase } from '../db';

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

export function getHospitalSettings(): HospitalSettings {
  const db = getDatabase();
  return db.prepare('SELECT * FROM hospital_settings WHERE id = 1').get() as HospitalSettings;
}

export function updateHospitalSettings(data: Partial<HospitalSettings>): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    const current = getHospitalSettings();
    const merged = { ...current, ...data };

    db.prepare(`
      UPDATE hospital_settings SET
        hospital_name = ?, address = ?, city = ?, taluka = ?, district = ?,
        pin_code = ?, phone = ?, email = ?, registration_number = ?, gst_number = ?,
        website = ?, logo_path = ?, currency = ?, currency_symbol = ?,
        bill_prefix = ?, opd_prefix = ?, receipt_prefix = ?, uhid_prefix = ?, ipd_prefix = ?,
        tax_enabled = ?, tax_rate = ?, paper_size = ?,
        footer_text = ?, terms_conditions = ?,
        session_timeout_minutes = ?, auto_backup = ?, backup_copies = ?,
        show_reprint_stamp = ?,
        updated_at = datetime('now','localtime')
      WHERE id = 1
    `).run(
      merged.hospital_name, merged.address, merged.city, merged.taluka, merged.district,
      merged.pin_code, merged.phone, merged.email, merged.registration_number, merged.gst_number,
      merged.website, merged.logo_path, merged.currency, merged.currency_symbol,
      merged.bill_prefix, merged.opd_prefix, merged.receipt_prefix, merged.uhid_prefix, merged.ipd_prefix,
      merged.tax_enabled, merged.tax_rate, merged.paper_size,
      merged.footer_text, merged.terms_conditions,
      merged.session_timeout_minutes, merged.auto_backup, merged.backup_copies,
      merged.show_reprint_stamp
    );
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
