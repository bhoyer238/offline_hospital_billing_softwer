import { useState, useEffect } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import type { Service, ServiceCategory } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  service_name: z.string().min(2, 'Name required'),
  category_id: z.coerce.number().min(1, 'Category required'),
  rate: z.coerce.number().min(0, 'Rate must be 0 or more'),
  unit: z.string().min(1, 'Unit required'),
  tax_applicable: z.coerce.number().default(0),
  description: z.string().optional(),
  is_active: z.coerce.number().default(1),
});
type FormData = z.infer<typeof schema>;

export default function ServicesPage() {
  const { user, settings } = useAuthStore();
  const sym = settings?.currency_symbol || '₹';
  const isAdmin = user?.role_name === 'admin';
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: 1, tax_applicable: 0, unit: 'per visit' },
  });

  const loadData = async () => {
    const [svcs, cats] = await Promise.all([window.api.services.getAll(false), window.api.services.getCategories()]);
    setServices(svcs.services || []);
    setCategories(cats.categories || []);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = services.filter(s => {
    const matchSearch = !search || s.service_name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || String(s.category_id) === categoryFilter;
    return matchSearch && matchCat;
  });

  const openAdd = () => { setEditingService(null); setIsModalOpen(true); };
  const openEdit = (svc: Service) => {
    setEditingService(svc);
    setIsModalOpen(true);
  };

  // Populate form AFTER modal mounts — Modal unmounts when closed,
  // so reset() before setIsModalOpen(true) has no effect on unmounted form.
  useEffect(() => {
    if (!isModalOpen) return;
    if (editingService) {
      reset({
        service_name: editingService.service_name,
        category_id: editingService.category_id,
        rate: paiseToRupees(editingService.rate),
        unit: editingService.unit,
        tax_applicable: editingService.tax_applicable,
        description: editingService.description || '',
        is_active: editingService.is_active,
      });
    } else {
      reset({ is_active: 1, tax_applicable: 0, unit: 'per visit' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = { ...data, rate: rupeesToPaise(data.rate) };
      const result = editingService
        ? await window.api.services.update(editingService.id, payload)
        : await window.api.services.create(payload);
      if (result.success) {
        toast.success(editingService ? 'Service updated' : 'Service added');
        setIsModalOpen(false);
        loadData();
      } else { toast.error((result as {error?: string}).error || 'Failed'); }
    } catch { toast.error('Error'); }
    finally { setIsSaving(false); }
  };

  const toggleActive = async (svc: Service) => {
    const result = await window.api.services.update(svc.id, { is_active: svc.is_active ? 0 : 1 });
    if (result.success) { toast.success(svc.is_active ? 'Service deactivated' : 'Service activated'); loadData(); }
    else toast.error('Failed');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Services</h1><p className="page-subtitle">{services.length} services in master</p></div>
        {isAdmin && <button onClick={openAdd} className="btn-primary"><Plus size={18} /> Add Service</button>}
      </div>

      <div className="card">
        <div className="card-header gap-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search services..." className="w-64" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select w-48">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Service Name</th><th>Category</th><th>Rate</th><th>Unit</th><th>Tax</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">No services found</td></tr>
              ) : filtered.map(svc => (
                <tr key={svc.id}>
                  <td><div className="font-medium text-slate-100">{svc.service_name}</div>{svc.description && <div className="text-xs text-slate-500">{svc.description}</div>}</td>
                  <td><span className="badge-neutral">{svc.category_name}</span></td>
                  <td className="font-semibold text-emerald-400">{formatCurrency(svc.rate, sym)}</td>
                  <td className="text-slate-400 text-xs">{svc.unit}</td>
                  <td>{svc.tax_applicable ? <span className="badge-info">Yes</span> : <span className="badge-neutral">No</span>}</td>
                  <td>{svc.is_active ? <span className="badge-success">Active</span> : <span className="badge-neutral">Inactive</span>}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(svc)} className="btn-ghost btn-icon btn-sm text-blue-400"><Edit2 size={15} /></button>
                        <button onClick={() => toggleActive(svc)} className="btn-ghost btn-icon btn-sm">{svc.is_active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-slate-500" />}</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingService ? 'Edit Service' : 'Add Service'} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>{isSaving ? 'Saving...' : (editingService ? 'Update' : 'Add Service')}</button></>}
      >
        <form className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2"><label className="form-label">Service Name *</label><input {...register('service_name')} className="form-input" autoFocus />{errors.service_name && <p className="form-error">{errors.service_name.message}</p>}</div>
          <div className="form-group"><label className="form-label">Category *</label><select {...register('category_id')} className="form-select"><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errors.category_id && <p className="form-error">{errors.category_id.message}</p>}</div>
          <div className="form-group"><label className="form-label">Rate (₹) *</label><input {...register('rate')} type="number" min="0" step="0.01" className="form-input" />{errors.rate && <p className="form-error">{errors.rate.message}</p>}</div>
          <div className="form-group"><label className="form-label">Unit *</label><input {...register('unit')} className="form-input" placeholder="per day, per visit, etc." /></div>
          <div className="form-group"><label className="form-label">Tax Applicable</label><select {...register('tax_applicable')} className="form-select"><option value={0}>No</option><option value={1}>Yes</option></select></div>
          <div className="form-group col-span-2"><label className="form-label">Description</label><textarea {...register('description')} className="form-input" rows={2} /></div>
          <div className="form-group"><label className="form-label">Status</label><select {...register('is_active')} className="form-select"><option value={1}>Active</option><option value={0}>Inactive</option></select></div>
        </form>
      </Modal>
    </div>
  );
}
