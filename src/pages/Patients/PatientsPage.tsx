import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Eye, Edit2, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { Patient, Doctor, Department } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  patient_name: z.string().min(2, 'Name required'),
  father_husband_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  age: z.coerce.number().min(0).max(150).optional(),
  age_unit: z.string().default('years'),
  gender: z.enum(['Male', 'Female', 'Other']),
  blood_group: z.string().optional(),
  mobile: z.string().optional(),
  mobile2: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  pin_code: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_mobile: z.string().optional(),
  doctor_id: z.coerce.number().optional().nullable(),
  department_id: z.coerce.number().optional().nullable(),
  insurance_name: z.string().optional(),
  policy_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PAGE_SIZE = 20;

export default function PatientsPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'Male', age_unit: 'years' },
  });

  // Auto-calculate age from DOB
  const watchedDob = watch('date_of_birth');
  useEffect(() => {
    if (!watchedDob) return;
    const dob = new Date(watchedDob);
    const today = new Date();
    if (dob > today) return; // future DOB — ignore
    const diffMs = today.getTime() - dob.getTime();
    const ageYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    setValue('age', ageYears, { shouldValidate: false });
    setValue('age_unit', 'years', { shouldValidate: false });
  }, [watchedDob, setValue]);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.patients.search(search, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setPatients(result.patients as Patient[]);
      setTotal(result.total);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const openAdd = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const openEdit = async (patient: Patient) => {
    // Fetch complete patient record — list search returns only basic fields (PatientListItem),
    // full details like address, taluka, emergency_contact, insurance etc. need patients.get()
    try {
      const result = await window.api.patients.get(patient.id);
      setEditingPatient(result.patient ?? patient);
    } catch {
      setEditingPatient(patient); // fallback to list data
    }
    setIsModalOpen(true);
  };

  // Populate form AFTER modal mounts (form is unmounted when closed, so reset() before
  // setIsModalOpen has no effect — this useEffect runs once modal is actually rendered)
  useEffect(() => {
    if (!isModalOpen) return;

    if (editingPatient) {
      // Edit mode: load existing patient data
      reset({
        patient_name: editingPatient.patient_name,
        father_husband_name: editingPatient.father_husband_name || '',
        date_of_birth: editingPatient.date_of_birth || '',
        age: editingPatient.age || undefined,
        age_unit: editingPatient.age_unit || 'years',
        gender: editingPatient.gender as 'Male' | 'Female' | 'Other',
        blood_group: editingPatient.blood_group || '',
        mobile: editingPatient.mobile || '',
        mobile2: editingPatient.mobile2 || '',
        email: editingPatient.email || '',
        address: editingPatient.address || '',
        city: editingPatient.city || '',
        taluka: editingPatient.taluka || '',
        district: editingPatient.district || '',
        pin_code: editingPatient.pin_code || '',
        emergency_contact_name: editingPatient.emergency_contact_name || '',
        emergency_contact_mobile: editingPatient.emergency_contact_mobile || '',
        doctor_id: editingPatient.doctor_id || null,
        department_id: editingPatient.department_id || null,
        insurance_name: editingPatient.insurance_name || '',
        policy_number: editingPatient.policy_number || '',
        notes: editingPatient.notes || '',
      });
    } else {
      // Add mode: blank form with defaults
      reset({ gender: 'Male', age_unit: 'years' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);


  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = {
        ...data,
        doctor_id: data.doctor_id || null,
        department_id: data.department_id || null,
      };

      let result;
      if (editingPatient) {
        result = await window.api.patients.update(editingPatient.id, payload);
      } else {
        result = await window.api.patients.create(payload);
      }

      if (result.success) {
        toast.success(editingPatient ? 'Patient updated successfully' : `Patient registered! UHID: ${(result as {uhid?: string}).uhid}`);
        setIsModalOpen(false);
        loadPatients();
      } else {
        toast.error((result as {error?: string}).error || 'Failed to save patient');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{total} patient{total !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <UserPlus size={18} /> New Patient
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name, UHID, mobile..."
            className="w-72"
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>UHID</th>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Mobile</th>
                <th>City</th>
                <th>Doctor</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">No patients found</td></tr>
              ) : (
                patients.map(patient => (
                  <tr key={patient.id}>
                    <td><span className="font-mono text-blue-400 text-xs">{patient.uhid}</span></td>
                    <td>
                      <div className="font-medium text-slate-100">{patient.patient_name}</div>
                      {patient.father_husband_name && (
                        <div className="text-xs text-slate-500">S/o D/o W/o: {patient.father_husband_name}</div>
                      )}
                    </td>
                    <td>
                      {patient.age ? `${patient.age} ${patient.age_unit}` : '-'} / {patient.gender}
                    </td>
                    <td>{patient.mobile || '-'}</td>
                    <td>{patient.city || '-'}</td>
                    <td>{patient.doctor_name || '-'}</td>
                    <td className="text-slate-500 text-xs">{formatDate(patient.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingPatient(patient)}
                          className="btn-ghost btn-icon btn-sm text-slate-400"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(patient)}
                          className="btn-ghost btn-icon btn-sm text-blue-400"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* Add/Edit Patient Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPatient ? 'Edit Patient' : 'Register New Patient'}
        size="2xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? 'Saving...' : (editingPatient ? 'Update Patient' : 'Register Patient')}
            </button>
          </>
        }
      >
        <form className="space-y-4">
          {/* Personal Info */}
          <p className="section-title">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label className="form-label">Full Name *</label>
              <input {...register('patient_name')} className="form-input" placeholder="Patient's full name" />
              {errors.patient_name && <p className="form-error">{errors.patient_name.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Father / Husband Name</label>
              <input {...register('father_husband_name')} className="form-input" placeholder="Guardian name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                {...register('date_of_birth')}
                type="date"
                className="form-input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Age {watchedDob ? <span className="text-xs text-blue-400 font-normal">(auto from DOB)</span> : ''}
              </label>
              <div className="flex gap-2">
                <input
                  {...register('age')}
                  type="number"
                  className={`form-input ${watchedDob ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : ''}`}
                  placeholder="Age"
                  readOnly={!!watchedDob}
                />
                <select {...register('age_unit')} className="form-select w-28" disabled={!!watchedDob}>
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select {...register('gender')} className="form-select">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="form-error">{errors.gender.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select {...register('blood_group')} className="form-select">
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact */}
          <p className="section-title">Contact Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Mobile</label>
              <input {...register('mobile')} className="form-input" placeholder="Primary mobile" />
            </div>
            <div className="form-group">
              <label className="form-label">Alt. Mobile</label>
              <input {...register('mobile2')} className="form-input" placeholder="Secondary mobile" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input {...register('email')} type="email" className="form-input" placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">PIN Code</label>
              <input {...register('pin_code')} className="form-input" placeholder="PIN" />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Address</label>
              <textarea {...register('address')} className="form-input" rows={2} placeholder="Full address" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input {...register('city')} className="form-input" placeholder="City" />
            </div>
            <div className="form-group">
              <label className="form-label">Taluka</label>
              <input {...register('taluka')} className="form-input" placeholder="Taluka" />
            </div>
            <div className="form-group">
              <label className="form-label">District</label>
              <input {...register('district')} className="form-input" placeholder="District" />
            </div>
          </div>

          {/* Medical */}
          <p className="section-title">Medical Information</p>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="form-group">
              <label className="form-label">Insurance / TPA</label>
              <input {...register('insurance_name')} className="form-input" placeholder="Insurance company" />
            </div>
            <div className="form-group">
              <label className="form-label">Policy Number</label>
              <input {...register('policy_number')} className="form-input" placeholder="Policy number" />
            </div>
          </div>

          {/* Emergency */}
          <p className="section-title">Emergency Contact</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input {...register('emergency_contact_name')} className="form-input" placeholder="Name" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Mobile</label>
              <input {...register('emergency_contact_mobile')} className="form-input" placeholder="Mobile" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input" rows={2} placeholder="Additional notes" />
          </div>
        </form>
      </Modal>

      {/* View Patient Modal */}
      {viewingPatient && (
        <Modal
          isOpen={!!viewingPatient}
          onClose={() => setViewingPatient(null)}
          title="Patient Details"
          size="xl"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setViewingPatient(null)}>Close</button>
              <button className="btn-primary" onClick={() => { openEdit(viewingPatient); setViewingPatient(null); }}>Edit</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl">
              <div className="w-14 h-14 bg-blue-600/20 rounded-full flex items-center justify-center">
                <User size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{viewingPatient.patient_name}</h3>
                <p className="text-blue-400 font-mono text-sm">{viewingPatient.uhid}</p>
                <p className="text-slate-400 text-sm">{viewingPatient.age} {viewingPatient.age_unit} &bull; {viewingPatient.gender} {viewingPatient.blood_group ? `• ${viewingPatient.blood_group}` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {([
                ['Father/Husband', viewingPatient.father_husband_name],
                ['Mobile', viewingPatient.mobile],
                ['Mobile 2', viewingPatient.mobile2],
                ['Email', viewingPatient.email],
                ['Address', viewingPatient.address],
                ['City', viewingPatient.city],
                ['District', viewingPatient.district],
                ['PIN', viewingPatient.pin_code],
                ['Doctor', viewingPatient.doctor_name],
                ['Department', viewingPatient.department_name],
                ['Insurance', viewingPatient.insurance_name],
                ['Policy No.', viewingPatient.policy_number],
                ['Emergency Contact', viewingPatient.emergency_contact_name],
                ['Emergency Mobile', viewingPatient.emergency_contact_mobile],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
