import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, LogOut as Discharge } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { IpdAdmission, Doctor, Department, Patient } from '../../types';
import { formatDate, today } from '../../utils/dateUtils';
import { useAuthStore } from '../../store/auth.store';
import clsx from 'clsx';

const schema = z.object({
  patient_id: z.coerce.number().min(1, 'Select a patient'),
  admission_date: z.string().min(1),
  admission_time: z.string().optional(),
  doctor_id: z.coerce.number().optional().nullable(),
  department_id: z.coerce.number().optional().nullable(),
  diagnosis: z.string().optional(),
  tpa_name: z.string().optional(),
  claim_number: z.string().optional(),
  policy_name: z.string().optional(),
  policy_number: z.string().optional(),
  insurance_details: z.string().optional(),
  category: z.string().default('General'),
  notes: z.string().optional(),
});

const dischargeSchema = z.object({
  discharge_date: z.string().min(1, 'Discharge date required'),
  discharge_time: z.string().optional(),
  diagnosis: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type DischargeData = z.infer<typeof dischargeSchema>;

const PAGE_SIZE = 20;

export default function IpdPage() {
  const { user } = useAuthStore();

  const [admissions, setAdmissions] = useState<IpdAdmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [viewingAdmission, setViewingAdmission] = useState<IpdAdmission | null>(null);
  const [dischargingAdmission, setDischargingAdmission] = useState<IpdAdmission | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { admission_date: today(), category: 'General' },
  });

  const { register: regDischarge, handleSubmit: handleDischarge, reset: resetDischarge, formState: { errors: errorsDischarge } } = useForm<DischargeData>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: { discharge_date: today() },
  });

  const loadAdmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.ipd.getAll(
        { status: statusFilter || undefined, search: search || undefined },
        PAGE_SIZE,
        (page - 1) * PAGE_SIZE
      );
      setAdmissions(result.admissions);
      setTotal(result.total);
    } catch {
      toast.error('Failed to load IPD admissions');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, statusFilter]);

  useEffect(() => { loadAdmissions(); }, [loadAdmissions]);

  useEffect(() => {
    async function loadRefs() {
      const [docs, depts] = await Promise.all([window.api.doctors.getAll(true), window.api.doctors.getDepartments()]);
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
    setIsSaving(true);
    try {
      const result = await window.api.ipd.create({
        ...data,
        doctor_id: data.doctor_id || null,
        department_id: data.department_id || null,
      });
      if (result.success) {
        toast.success(`IPD admission created: ${result.ipd_number}`);
        setIsModalOpen(false);
        setSelectedPatient(null);
        reset({ admission_date: today(), category: 'General' });
        loadAdmissions();
      } else {
        toast.error(result.error || 'Failed');
      }
    } catch { toast.error('Error occurred'); }
    finally { setIsSaving(false); }
  };

  const onDischarge = async (data: DischargeData) => {
    if (!dischargingAdmission) return;
    setIsSaving(true);
    try {
      const result = await window.api.ipd.update(dischargingAdmission.id, {
        discharge_date: data.discharge_date,
        discharge_time: data.discharge_time,
        diagnosis: data.diagnosis,
        status: 'Discharged',
      });
      if (result.success) {
        toast.success('Patient discharged successfully');
        setIsDischargeOpen(false);
        setDischargingAdmission(null);
        loadAdmissions();
      } else {
        toast.error(result.error || 'Failed');
      }
    } catch { toast.error('Error'); }
    finally { setIsSaving(false); }
  };

  const statusBadge = (status: string) => {
    if (status === 'Admitted') return <span className="badge-info">Admitted</span>;
    if (status === 'Discharged') return <span className="badge-success">Discharged</span>;
    return <span className="badge-danger">Cancelled</span>;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">IPD Admissions</h1>
          <p className="page-subtitle">{total} admissions</p>
        </div>
        <button onClick={() => { reset({ admission_date: today(), category: 'General' }); setSelectedPatient(null); setIsModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> New Admission
        </button>
      </div>

      <div className="card">
        <div className="card-header gap-4">
          <SearchInput value={search} onChange={val => { setSearch(val); setPage(1); }} placeholder="Search by name, UHID, IPD No..." className="w-72" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="form-select w-40">
            <option value="">All Status</option>
            <option value="Admitted">Admitted</option>
            <option value="Discharged">Discharged</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="table-container">
          <table className="table">
            <thead><tr>
              <th>IPD No.</th><th>Patient</th><th>Admission Date</th><th>Doctor</th><th>Diagnosis</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : admissions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">No admissions found</td></tr>
              ) : admissions.map(adm => (
                <tr key={adm.id}>
                  <td><span className="font-mono text-blue-400 text-xs">{adm.ipd_number}</span></td>
                  <td>
                    <div className="font-medium text-slate-100">{adm.patient_name}</div>
                    <div className="text-xs text-slate-500">{adm.uhid}</div>
                  </td>
                  <td className="text-slate-400 text-xs">{formatDate(adm.admission_date)}</td>
                  <td>{adm.doctor_name || '-'}</td>
                  <td className="max-w-xs truncate text-slate-400">{adm.diagnosis || '-'}</td>
                  <td>{statusBadge(adm.status)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewingAdmission(adm)} className="btn-ghost btn-icon btn-sm" title="View"><Eye size={15} /></button>
                      {adm.status === 'Admitted' && (
                        <button onClick={() => { setDischargingAdmission(adm); resetDischarge({ discharge_date: today() }); setIsDischargeOpen(true); }} className="btn-ghost btn-icon btn-sm text-amber-400" title="Discharge">
                          <Discharge size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* New Admission Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New IPD Admission" size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Admit Patient'}</button>
          </>
        }
      >
        <form className="space-y-4">
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
                <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="form-input" placeholder="Search patient..." />
                {patientResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {patientResults.map(p => (
                      <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setValue('patient_id', p.id); setPatientSearch(''); setPatientResults([]); }} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors">
                        <p className="text-slate-100 text-sm">{p.patient_name}</p>
                        <p className="text-slate-500 text-xs">{p.uhid} &bull; {p.age} yrs &bull; {p.gender}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.patient_id && <p className="form-error">{errors.patient_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">Admission Date *</label><input {...register('admission_date')} type="date" className="form-input" /></div>
            <div className="form-group"><label className="form-label">Admission Time</label><input {...register('admission_time')} type="time" className="form-input" /></div>
            <div className="form-group"><label className="form-label">Doctor</label><select {...register('doctor_id')} className="form-select"><option value="">Select</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.doctor_name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Department</label><select {...register('department_id')} className="form-select"><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Category</label><select {...register('category')} className="form-select"><option value="General">General</option><option value="Semi-Private">Semi-Private</option><option value="Private">Private</option><option value="ICU">ICU</option><option value="NICU">NICU</option></select></div>
            <div className="form-group"><label className="form-label">TPA / Insurance</label><input {...register('tpa_name')} className="form-input" placeholder="TPA Name" /></div>
            <div className="form-group"><label className="form-label">Claim Number</label><input {...register('claim_number')} className="form-input" placeholder="Claim No." /></div>
            <div className="form-group"><label className="form-label">Policy Name</label><input {...register('policy_name')} className="form-input" placeholder="Policy Name" /></div>
          </div>
          <div className="form-group"><label className="form-label">Diagnosis</label><textarea {...register('diagnosis')} className="form-input" rows={2} placeholder="Preliminary diagnosis" /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea {...register('notes')} className="form-input" rows={2} /></div>
        </form>
      </Modal>

      {/* Discharge Modal */}
      <Modal isOpen={isDischargeOpen} onClose={() => setIsDischargeOpen(false)} title={`Discharge Patient: ${dischargingAdmission?.patient_name}`} size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsDischargeOpen(false)}>Cancel</button>
            <button className="btn-warning" onClick={handleDischarge(onDischarge)} disabled={isSaving}>{isSaving ? 'Processing...' : 'Confirm Discharge'}</button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">Discharge Date *</label><input {...regDischarge('discharge_date')} type="date" className="form-input" />{errorsDischarge.discharge_date && <p className="form-error">{errorsDischarge.discharge_date.message}</p>}</div>
            <div className="form-group"><label className="form-label">Discharge Time</label><input {...regDischarge('discharge_time')} type="time" className="form-input" /></div>
          </div>
          <div className="form-group"><label className="form-label">Final Diagnosis</label><textarea {...regDischarge('diagnosis')} className="form-input" rows={3} placeholder="Final diagnosis at discharge" /></div>
        </form>
      </Modal>

      {/* View Details Modal */}
      {viewingAdmission && (
        <Modal isOpen={!!viewingAdmission} onClose={() => setViewingAdmission(null)} title="IPD Admission Details" size="xl"
          footer={<button className="btn-secondary" onClick={() => setViewingAdmission(null)}>Close</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {([
                ['IPD Number', viewingAdmission.ipd_number],
                ['Patient', viewingAdmission.patient_name],
                ['UHID', viewingAdmission.uhid],
                ['Doctor', viewingAdmission.doctor_name],
                ['Admission Date', formatDate(viewingAdmission.admission_date)],
                ['Discharge Date', formatDate(viewingAdmission.discharge_date)],
                ['Status', viewingAdmission.status],
                ['Category', viewingAdmission.category],
                ['TPA', viewingAdmission.tpa_name],
                ['Claim No.', viewingAdmission.claim_number],
                ['Diagnosis', viewingAdmission.diagnosis],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-sm text-slate-200">{value}</p></div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
