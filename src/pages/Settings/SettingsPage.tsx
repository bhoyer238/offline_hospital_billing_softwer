import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Upload, Save, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import type { HospitalSettings } from '../../types';

const schema = z.object({
  hospital_name: z.string().min(2, 'Required'),
  address: z.string().optional(),
  city: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  pin_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  registration_number: z.string().optional(),
  gst_number: z.string().optional(),
  website: z.string().optional(),
  currency: z.string().default('INR'),
  currency_symbol: z.string().default('₹'),
  bill_prefix: z.string().default('BILL'),
  opd_prefix: z.string().default('OPD'),
  receipt_prefix: z.string().default('RCPT'),
  uhid_prefix: z.string().default('UHID'),
  ipd_prefix: z.string().default('IPD'),
  tax_enabled: z.coerce.number().default(0),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  paper_size: z.string().default('A4'),
  footer_text: z.string().optional(),
  terms_conditions: z.string().optional(),
  session_timeout_minutes: z.coerce.number().min(5).max(480).default(60),
  auto_backup: z.coerce.number().default(0),
  backup_copies: z.coerce.number().min(1).max(100).default(10),
  show_reprint_stamp: z.coerce.number().default(1),
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const { settings, setSettings, user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    async function load() {
      const result = await window.api.settings.get();
      if (result.success) {
        const s = result.settings;
        setLogoPath(s.logo_path || null);
        reset({
          hospital_name: s.hospital_name,
          address: s.address || '',
          city: s.city || '',
          taluka: s.taluka || '',
          district: s.district || '',
          pin_code: s.pin_code || '',
          phone: s.phone || '',
          email: s.email || '',
          registration_number: s.registration_number || '',
          gst_number: s.gst_number || '',
          website: s.website || '',
          currency: s.currency || 'INR',
          currency_symbol: s.currency_symbol || '₹',
          bill_prefix: s.bill_prefix || 'BILL',
          opd_prefix: s.opd_prefix || 'OPD',
          receipt_prefix: s.receipt_prefix || 'RCPT',
          uhid_prefix: s.uhid_prefix || 'UHID',
          ipd_prefix: s.ipd_prefix || 'IPD',
          tax_enabled: s.tax_enabled || 0,
          tax_rate: s.tax_rate || 0,
          paper_size: s.paper_size || 'A4',
          footer_text: s.footer_text || '',
          terms_conditions: s.terms_conditions || '',
          session_timeout_minutes: s.session_timeout_minutes || 60,
          auto_backup: s.auto_backup || 0,
          backup_copies: s.backup_copies || 10,
          show_reprint_stamp: s.show_reprint_stamp ?? 1,
        });
      }
    }
    load();
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const result = await window.api.settings.update(data);
      if (result.success) {
        toast.success('Settings saved successfully');
        const updated = await window.api.settings.get();
        if (updated.success) setSettings(updated.settings);
      } else toast.error(result.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setIsSaving(false); }
  };

  const uploadLogo = async () => {
    const result = await window.api.settings.uploadLogo();
    if (result.success && result.logoPath) {
      setLogoPath(result.logoPath);
      toast.success('Logo uploaded');
    } else if (!result.success && result.error && result.error !== 'No file selected') {
      toast.error(result.error);
    }
  };

  const changeMyPassword = async () => {
    if (!newPw || newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (!user) return;
    setIsChangingPw(true);
    try {
      const result = await window.api.auth.changePassword(user.id, newPw);
      if (result.success) { toast.success('Password changed'); setNewPw(''); setConfirmPw(''); }
      else toast.error(result.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setIsChangingPw(false); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><Settings size={24} className="text-blue-400" /> Settings</h1><p className="page-subtitle">Configure hospital billing system</p></div>
        <button onClick={handleSubmit(onSubmit)} disabled={isSaving} className="btn-primary"><Save size={16} /> {isSaving ? 'Saving...' : 'Save Settings'}</button>
      </div>

      <form className="space-y-6">
        {/* Hospital Info */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-100">Hospital Information</h3></div>
          <div className="card-body">
            {/* Logo */}
            <div className="flex items-start gap-6 mb-6">
              <div className="w-24 h-24 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPath ? <img src={`file://${logoPath}`} alt="Logo" className="w-full h-full object-contain" />
                  : <span className="text-slate-500 text-xs text-center p-2">No Logo</span>}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Hospital Logo</p>
                <button type="button" onClick={uploadLogo} className="btn-secondary btn-sm"><Upload size={14} /> Upload Logo</button>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF supported</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2"><label className="form-label">Hospital Name *</label><input {...register('hospital_name')} className="form-input" />{errors.hospital_name && <p className="form-error">{errors.hospital_name.message}</p>}</div>
              <div className="form-group col-span-2"><label className="form-label">Address</label><textarea {...register('address')} className="form-input" rows={2} /></div>
              <div className="form-group"><label className="form-label">City</label><input {...register('city')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Taluka</label><input {...register('taluka')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">District</label><input {...register('district')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">PIN Code</label><input {...register('pin_code')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Phone</label><input {...register('phone')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Email</label><input {...register('email')} type="email" className="form-input" /></div>
              <div className="form-group"><label className="form-label">Registration No.</label><input {...register('registration_number')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">GST Number</label><input {...register('gst_number')} className="form-input" /></div>
              <div className="form-group col-span-2"><label className="form-label">Website</label><input {...register('website')} className="form-input" /></div>
            </div>
          </div>
        </div>

        {/* Billing Settings */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-100">Billing Configuration</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group"><label className="form-label">Currency Symbol</label><input {...register('currency_symbol')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Currency Code</label><input {...register('currency')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Bill Number Prefix</label><input {...register('bill_prefix')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">OPD Number Prefix</label><input {...register('opd_prefix')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Receipt Prefix</label><input {...register('receipt_prefix')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">UHID Prefix</label><input {...register('uhid_prefix')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">IPD Prefix</label><input {...register('ipd_prefix')} className="form-input" /></div>
              <div className="form-group"><label className="form-label">Paper Size</label><select {...register('paper_size')} className="form-select"><option value="A4">A4</option><option value="A5">A5</option></select></div>
              <div className="form-group"><label className="form-label">Tax Enabled</label><select {...register('tax_enabled')} className="form-select"><option value={0}>No</option><option value={1}>Yes</option></select></div>
              <div className="form-group"><label className="form-label">Tax Rate (%)</label><input {...register('tax_rate')} type="number" min="0" max="100" step="0.01" className="form-input" /></div>
              <div className="form-group"><label className="form-label">Show Reprint Stamp</label><select {...register('show_reprint_stamp')} className="form-select"><option value={1}>Yes</option><option value={0}>No</option></select></div>
              <div className="form-group col-span-2"><label className="form-label">Bill Footer Text</label><textarea {...register('footer_text')} className="form-input" rows={2} /></div>
              <div className="form-group col-span-2"><label className="form-label">Terms & Conditions</label><textarea {...register('terms_conditions')} className="form-input" rows={3} /></div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-100">System Settings</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group"><label className="form-label">Session Timeout (minutes)</label><input {...register('session_timeout_minutes')} type="number" min="5" max="480" className="form-input" /></div>
              <div className="form-group"><label className="form-label">Auto Backup</label><select {...register('auto_backup')} className="form-select"><option value={0}>Disabled</option><option value={1}>On Startup</option></select></div>
              <div className="form-group"><label className="form-label">Max Backup Copies</label><input {...register('backup_copies')} type="number" min="1" max="100" className="form-input" /></div>
            </div>
          </div>
        </div>
      </form>

      {/* Change My Password */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-slate-100 flex items-center gap-2"><KeyRound size={18} /> Change My Password</h3></div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="form-group"><label className="form-label">New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="form-input" placeholder="Min 6 characters" /></div>
            <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="form-input" placeholder="Repeat password" /></div>
          </div>
          <button onClick={changeMyPassword} disabled={isChangingPw} className="btn-primary mt-3">
            {isChangingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-slate-100">About Software</h3></div>
        <div className="card-body">
          <div className="flex items-start gap-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
              <span className="text-white text-2xl">🏥</span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-slate-100">Hospital Billing Management System</p>
              <p className="text-sm text-slate-400 mt-1">Version 1.0.0 · Build September 2026</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> 100% Offline — No internet needed</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> Patient & UHID Management</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> OPD & IPD Billing (PDF)</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> Payment Tracking (Cash/Card/UPI)</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> Revenue Reports & Charts</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> Role-based Access Control</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> Day / Night Mode</div>
                <div className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400">✓</span> Audit Trail & Backup</div>
              </div>
              <p className="text-xs text-slate-600 mt-4">Built with Electron · React · SQLite · Tailwind CSS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
