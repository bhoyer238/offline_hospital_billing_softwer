import { useState, useEffect } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import type { Doctor, Department } from '../../types';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  doctor_name: z.string().min(2, 'Name required'),
  specialization: z.string().optional(),
  department_id: z.coerce.number().optional().nullable(),
  registration_number: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  is_active: z.coerce.number().default(1),
});
type FormData = z.infer<typeof schema>;

export default function DoctorsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role_name === 'admin';
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: 1 },
  });

  const loadDoctors = async () => {
    const [docs, depts] = await Promise.all([window.api.doctors.getAll(false), window.api.doctors.getDepartments()]);
    setDoctors(docs.doctors || []);
    setDepartments(depts.departments || []);
  };

  useEffect(() => { loadDoctors(); }, []);

  const filtered = doctors.filter(d => !search || d.doctor_name.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditingDoctor(null); setIsModalOpen(true); };

  const openEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setIsModalOpen(true);
  };

  // Populate form AFTER modal mounts — Modal uses if(!isOpen) return null,
  // so reset() before setIsModalOpen(true) has no effect on unmounted form.
  useEffect(() => {
    if (!isModalOpen) return;
    if (editingDoctor) {
      reset({
        doctor_name: editingDoctor.doctor_name,
        specialization: editingDoctor.specialization || '',
        department_id: editingDoctor.department_id || null,
        registration_number: editingDoctor.registration_number || '',
        mobile: editingDoctor.mobile || '',
        email: editingDoctor.email || '',
        is_active: editingDoctor.is_active,
      });
    } else {
      reset({ is_active: 1 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = { ...data, department_id: data.department_id || null };
      const result = editingDoctor
        ? await window.api.doctors.update(editingDoctor.id, payload)
        : await window.api.doctors.create(payload);
      if (result.success) {
        toast.success(editingDoctor ? 'Doctor updated' : 'Doctor added');
        setIsModalOpen(false);
        loadDoctors();
      } else { toast.error((result as {error?: string}).error || 'Failed'); }
    } catch { toast.error('Error'); }
    finally { setIsSaving(false); }
  };

  const toggleActive = async (doc: Doctor) => {
    const result = await window.api.doctors.update(doc.id, { is_active: doc.is_active ? 0 : 1 });
    if (result.success) { toast.success(doc.is_active ? 'Doctor deactivated' : 'Doctor activated'); loadDoctors(); }
    else toast.error((result as {error?: string}).error || 'Failed');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Doctors</h1><p className="page-subtitle">{doctors.length} doctors</p></div>
        {isAdmin && <button onClick={openAdd} className="btn-primary"><Plus size={18} /> Add Doctor</button>}
      </div>

      <div className="card">
        <div className="card-header">
          <SearchInput value={search} onChange={setSearch} placeholder="Search doctors..." className="w-72" />
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Doctor Name</th><th>Specialization</th><th>Department</th><th>Registration No.</th><th>Mobile</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">No doctors found</td></tr>
              ) : filtered.map(doc => (
                <tr key={doc.id}>
                  <td><div className="font-medium text-slate-100">{doc.doctor_name}</div></td>
                  <td>{doc.specialization || '-'}</td>
                  <td>{doc.department_name || '-'}</td>
                  <td className="font-mono text-xs">{doc.registration_number || '-'}</td>
                  <td>{doc.mobile || '-'}</td>
                  <td>{doc.is_active ? <span className="badge-success">Active</span> : <span className="badge-neutral">Inactive</span>}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(doc)} className="btn-ghost btn-icon btn-sm text-blue-400"><Edit2 size={15} /></button>
                        <button onClick={() => toggleActive(doc)} className="btn-ghost btn-icon btn-sm">{doc.is_active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-slate-500" />}</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>{isSaving ? 'Saving...' : (editingDoctor ? 'Update' : 'Add Doctor')}</button></>}
      >
        <form className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2"><label className="form-label">Doctor Name *</label><input {...register('doctor_name')} className="form-input" autoFocus />{errors.doctor_name && <p className="form-error">{errors.doctor_name.message}</p>}</div>
          <div className="form-group"><label className="form-label">Specialization</label><input {...register('specialization')} className="form-input" /></div>
          <div className="form-group"><label className="form-label">Department</label><select {...register('department_id')} className="form-select"><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Registration No.</label><input {...register('registration_number')} className="form-input" /></div>
          <div className="form-group"><label className="form-label">Mobile</label><input {...register('mobile')} className="form-input" /></div>
          <div className="form-group col-span-2"><label className="form-label">Email</label><input {...register('email')} type="email" className="form-input" /></div>
          <div className="form-group"><label className="form-label">Status</label><select {...register('is_active')} className="form-select"><option value={1}>Active</option><option value={0}>Inactive</option></select></div>
        </form>
      </Modal>
    </div>
  );
}
