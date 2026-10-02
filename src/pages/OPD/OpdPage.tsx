import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import type { OpdVisit, Doctor, Department, Patient } from '../../types';
import { formatDate, today } from '../../utils/dateUtils';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  patient_search: z.string().optional(),
  patient_id: z.coerce.number().min(1, 'Select a patient'),
  doctor_id: z.coerce.number().optional().nullable(),
  department_id: z.coerce.number().optional().nullable(),
  visit_date: z.string().min(1),
  visit_time: z.string().optional(),
  consultation_fee: z.coerce.number().min(0).default(0),
  other_charges: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  payment_mode: z.string().default('Cash'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PAGE_SIZE = 20;

export default function OpdPage() {
  const { settings, user } = useAuthStore();
  const sym = settings?.currency_symbol || '₹';

  const [visits, setVisits] = useState<OpdVisit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visit_date: today(), payment_mode: 'Cash', consultation_fee: 0, other_charges: 0, discount: 0 },
  });

  const consultationFee = watch('consultation_fee') || 0;
  const otherCharges = watch('other_charges') || 0;
  const discount = watch('discount') || 0;
  const total_amount = Math.max(0, Number(consultationFee) + Number(otherCharges) - Number(discount));

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.opd.getAll(undefined, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setVisits(result.visits);
      setTotal(result.total);
    } catch {
      toast.error('Failed to load OPD visits');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { loadVisits(); }, [loadVisits]);

  useEffect(() => {
    async function loadRefs() {
      const [docs, depts] = await Promise.all([
        window.api.doctors.getAll(true),
        window.api.doctors.getDepartments(),
      ]);
      setDoctors(docs.doctors || []);
      setDepartments(depts.departments || []);
    }
    loadRefs();
  }, []);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const r = await window.api.patients.search(patientSearch, 10, 0);
      setPatientResults(r.patients as Patient[]);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const onSubmit = async (data: FormData) => {
    if (!data.patient_id) { toast.error('Please select a patient'); return; }
    setIsSaving(true);
    try {
      const result = await window.api.opd.create({
        patient_id: data.patient_id,
        doctor_id: data.doctor_id || null,
        department_id: data.department_id || null,
        visit_date: data.visit_date,
        visit_time: data.visit_time || null,
        consultation_fee: rupeesToPaise(data.consultation_fee),
        other_charges: rupeesToPaise(data.other_charges),
        discount: rupeesToPaise(data.discount),
        total: rupeesToPaise(total_amount),
        payment_status: 'Paid',
        payment_mode: data.payment_mode,
        notes: data.notes || null,
      });

      if (result.success) {
        toast.success(`OPD visit registered: ${result.opd_number}`);
        setIsModalOpen(false);
        setSelectedPatient(null);
        reset({ visit_date: today(), payment_mode: 'Cash' });
        loadVisits();
      } else {
        toast.error(result.error || 'Failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const paymentStatusBadge = (status: string) => {
    if (status === 'Paid') return <span className="badge-success">{status}</span>;
    if (status === 'Partially Paid') return <span className="badge-warning">{status}</span>;
    return <span className="badge-danger">{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">OPD Visits</h1>
          <p className="page-subtitle">{total} visits registered</p>
        </div>
        <button onClick={() => { reset({ visit_date: today(), payment_mode: 'Cash' }); setSelectedPatient(null); setIsModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> New OPD Visit
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <SearchInput value={search} onChange={setSearch} placeholder="Search OPD..." className="w-72" />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>OPD No.</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Doctor</th>
                <th>Consultation Fee</th>
                <th>Total</th>
                <th>Status</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : visits.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">No OPD visits found</td></tr>
              ) : visits.map(v => (
                <tr key={v.id}>
                  <td><span className="font-mono text-blue-400 text-xs">{v.opd_number}</span></td>
                  <td>
                    <div className="font-medium text-slate-100">{v.patient_name}</div>
                    <div className="text-xs text-slate-500">{v.uhid}</div>
                  </td>
                  <td className="text-slate-400 text-xs">{formatDate(v.visit_date)}</td>
                  <td>{v.doctor_name || '-'}</td>
                  <td>{formatCurrency(v.consultation_fee, sym)}</td>
                  <td className="font-semibold text-emerald-400">{formatCurrency(v.total, sym)}</td>
                  <td>{paymentStatusBadge(v.payment_status)}</td>
                  <td>{v.payment_mode || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* New OPD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register OPD Visit"
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Register Visit'}
            </button>
          </>
        }
      >
        <form className="space-y-4">
          {/* Patient Selection */}
          <div className="form-group">
            <label className="form-label">Patient *</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                <div>
                  <p className="text-slate-100 font-medium">{selectedPatient.patient_name}</p>
                  <p className="text-blue-400 text-xs font-mono">{selectedPatient.uhid} &bull; {selectedPatient.age} yrs &bull; {selectedPatient.gender}</p>
                </div>
                <button type="button" onClick={() => { setSelectedPatient(null); setValue('patient_id', 0 as unknown as number); }} className="btn-ghost btn-sm">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="form-input"
                  placeholder="Search patient by name, UHID, mobile..."
                />
                {patientResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {patientResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPatient(p); setValue('patient_id', p.id); setPatientSearch(''); setPatientResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors"
                      >
                        <p className="text-slate-100 text-sm">{p.patient_name}</p>
                        <p className="text-slate-500 text-xs">{p.uhid} &bull; {p.age} {p.age_unit} &bull; {p.gender}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Visit Date *</label>
              <input {...register('visit_date')} type="date" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Visit Time</label>
              <input {...register('visit_time')} type="time" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Doctor</label>
              <select {...register('doctor_id')} className="form-select">
                <option value="">Select Doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.doctor_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select {...register('department_id')} className="form-select">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <p className="section-title">Charges</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Consultation Fee (₹)</label>
              <input {...register('consultation_fee')} type="number" min="0" step="0.01" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Other Charges (₹)</label>
              <input {...register('other_charges')} type="number" min="0" step="0.01" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Discount (₹)</label>
              <input {...register('discount')} type="number" min="0" step="0.01" className="form-input" />
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-xl flex justify-between items-center">
            <p className="text-slate-400">Total Amount</p>
            <p className="text-2xl font-bold text-emerald-400">{sym}{total_amount.toFixed(2)}</p>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select {...register('payment_mode')} className="form-select">
              {['Cash','Card','UPI','Bank Transfer','Cheque','Other'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input" rows={2} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
