import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Eye, XCircle, Printer, FileDown, Search, Edit2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import BillPreview from '../../components/billing/BillPreview';
import type { Bill, Service, Patient, IpdAdmission, OpdVisit, Doctor } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees, numberToWords, calculateDiscount, calculateTax } from '../../utils/currency';
import { formatDate, today } from '../../utils/dateUtils';
import { useAuthStore } from '../../store/auth.store';
import clsx from 'clsx';

const PAGE_SIZE = 20;

const itemSchema = z.object({
  service_id: z.number().nullable(),
  service_name: z.string().min(1, 'Required'),
  quantity: z.coerce.number().min(1),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const billSchema = z.object({
  bill_type: z.enum(['IPD', 'OPD']),
  patient_id: z.coerce.number().min(1),
  ipd_id: z.coerce.number().optional().nullable(),
  opd_id: z.coerce.number().optional().nullable(),
  doctor_id: z.coerce.number().optional().nullable(),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one service'),
});

type BillFormData = z.infer<typeof billSchema>;

export default function BillingPage() {
  const { user, settings } = useAuthStore();
  const sym = settings?.currency_symbol || '₹';
  const isAdmin = user?.role_name === 'admin';

  // List state
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Bill creation state
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [billStep, setBillStep] = useState(1); // 1=patient, 2=services, 3=payment
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [ipdAdmissions, setIpdAdmissions] = useState<IpdAdmission[]>([]);
  const [opdVisits, setOpdVisits] = useState<OpdVisit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceResults, setServiceResults] = useState<Service[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  // View/preview state
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; bill: Bill | null }>({ open: false, bill: null });
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const { register, control, handleSubmit, watch, setValue, reset, getValues, formState: { errors } } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: { bill_type: 'IPD', discount_percent: 0, discount_amount: 0, items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const watchDiscountPercent = watch('discount_percent');
  const watchDiscountAmount = watch('discount_amount');
  const billType = watch('bill_type');

  // Calculate totals
  const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discountAmt = watchDiscountPercent > 0
    ? calculateDiscount(rupeesToPaise(subtotal), watchDiscountPercent)
    : rupeesToPaise(watchDiscountAmount || 0);
  const taxRate = settings?.tax_enabled ? (settings.tax_rate || 0) : 0;
  const taxAmt = calculateTax(rupeesToPaise(subtotal) - discountAmt, taxRate);
  const netAmount = Math.max(0, rupeesToPaise(subtotal) - discountAmt + taxAmt);

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.billing.searchBills(search, { status: statusFilter || undefined }, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setBills(result.bills);
      setTotal(result.total);
    } catch { toast.error('Failed to load bills'); }
    finally { setIsLoading(false); }
  }, [search, page, statusFilter]);

  useEffect(() => { loadBills(); }, [loadBills]);

  useEffect(() => {
    async function loadRefs() {
      const [svcs, docs] = await Promise.all([window.api.services.getAll(true), window.api.doctors.getAll(true)]);
      setAllServices(svcs.services || []);
      setDoctors(docs.doctors || []);
    }
    loadRefs();
  }, []);

  // Patient search
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      const r = await window.api.patients.search(patientSearch, 10, 0);
      setPatientResults(r.patients as Patient[]);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Service search
  useEffect(() => {
    if (serviceSearch.length < 1) { setServiceResults(allServices.slice(0, 20)); return; }
    const filtered = allServices.filter(s => s.service_name.toLowerCase().includes(serviceSearch.toLowerCase()));
    setServiceResults(filtered.slice(0, 20));
  }, [serviceSearch, allServices]);

  // When patient is selected, load their IPD/OPD records
  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setValue('patient_id', patient.id);
    setPatientSearch('');
    setPatientResults([]);

    const [ipd, opd] = await Promise.all([
      window.api.ipd.getAll({ patientId: patient.id, status: 'Admitted' }, 50, 0),
      window.api.opd.getAll(patient.id, 50, 0),
    ]);
    setIpdAdmissions(ipd.admissions || []);
    setOpdVisits(opd.visits || []);
  };

  const addService = (svc: Service) => {
    const rate = paiseToRupees(svc.rate);
    append({ service_id: svc.id, service_name: svc.service_name, quantity: 1, rate, amount: rate, notes: '' });
    setServiceSearch('');
    setServiceResults([]);
  };

  const addCustomService = () => {
    append({ service_id: null, service_name: '', quantity: 1, rate: 0, amount: 0, notes: '' });
  };

  const updateItemAmount = (index: number) => {
    const items = getValues('items');
    const item = items[index];
    if (item) {
      const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      setValue(`items.${index}.amount`, amount);
    }
  };

  const onSubmit = async (data: BillFormData) => {
    setIsSaving(true);
    try {
      const billData = {
        bill_type: data.bill_type,
        patient_id: data.patient_id,
        ipd_id: data.ipd_id || null,
        opd_id: data.opd_id || null,
        doctor_id: data.doctor_id || null,
        subtotal: rupeesToPaise(subtotal),
        discount_amount: discountAmt,
        discount_percent: Number(watchDiscountPercent) || 0,
        tax_amount: taxAmt,
        net_amount: netAmount,
        items: data.items.map((item, idx) => ({
          service_id: item.service_id,
          service_name: item.service_name,
          quantity: Number(item.quantity),
          rate: rupeesToPaise(item.rate),
          amount: rupeesToPaise(item.amount),
          notes: item.notes || null,
          sort_order: idx,
        })),
        notes: data.notes || null,
      };

      const result = await window.api.billing.createBill(billData);
      if (!result.success || !result.bill) {
        toast.error(result.error || 'Failed to create bill');
        return;
      }

      // Record payment if provided
      if (paymentAmount > 0) {
        await window.api.billing.addPayment({
          bill_id: result.bill.id,
          patient_id: result.bill.patient_id,
          amount: rupeesToPaise(paymentAmount),
          payment_mode: paymentMode,
        });
      }

      toast.success(`Bill created: ${result.bill.bill_number}`);
      setIsNewBillOpen(false);
      setBillStep(1);
      setSelectedPatient(null);
      setPaymentAmount(0);
      reset({ bill_type: 'IPD', discount_percent: 0, discount_amount: 0, items: [] });
      loadBills();

      // Show preview
      const fullBill = await window.api.billing.getBill(result.bill.id);
      if (fullBill.bill) setPreviewBill(fullBill.bill);
    } catch { toast.error('Error occurred'); }
    finally { setIsSaving(false); }
  };

  const cancelBill = async () => {
    if (!cancelDialog.bill || !cancelReason.trim()) { toast.error('Please enter a reason'); return; }
    setIsCancelling(true);
    try {
      const result = await window.api.billing.cancelBill(cancelDialog.bill.id, cancelReason);
      if (result.success) {
        toast.success('Bill cancelled');
        setCancelDialog({ open: false, bill: null });
        setCancelReason('');
        loadBills();
      } else { toast.error(result.error || 'Failed'); }
    } catch { toast.error('Error'); }
    finally { setIsCancelling(false); }
  };

  const viewBill = async (id: number) => {
    const result = await window.api.billing.getBill(id);
    if (result.bill) setPreviewBill(result.bill);
    else toast.error('Bill not found');
  };

  const statusBadge = (status: string) => {
    if (status === 'Finalized') return <span className="badge-success">Finalized</span>;
    if (status === 'Cancelled') return <span className="badge-danger">Cancelled</span>;
    return <span className="badge-warning">Draft</span>;
  };

  const balanceBadge = (balance: number) => {
    if (balance <= 0) return <span className="badge-success">Paid</span>;
    return <span className="badge-warning">Pending {formatCurrency(balance, sym)}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Billing</h1><p className="page-subtitle">{total} bills</p></div>
        <button onClick={() => { reset({ bill_type: 'IPD', discount_percent: 0, discount_amount: 0, items: [] }); setSelectedPatient(null); setBillStep(1); setPaymentAmount(0); setIsNewBillOpen(true); }} className="btn-primary">
          <Plus size={18} /> Create Bill
        </button>
      </div>

      {/* Bills List */}
      <div className="card">
        <div className="card-header gap-4 flex-wrap">
          <SearchInput value={search} onChange={val => { setSearch(val); setPage(1); }} placeholder="Search by bill no., patient, UHID..." className="w-72" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="form-select w-36">
            <option value="">All Status</option>
            <option value="Finalized">Finalized</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr>
              <th>Bill No.</th><th>Date</th><th>Patient</th><th>Type</th><th>Net Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">No bills found</td></tr>
              ) : bills.map(bill => (
                <tr key={bill.id}>
                  <td><span className="font-mono text-blue-400 text-xs">{bill.bill_number}</span></td>
                  <td className="text-slate-400 text-xs">{formatDate(bill.bill_date)}</td>
                  <td>
                    <div className="font-medium text-slate-100">{bill.patient_name}</div>
                    <div className="text-xs text-slate-500">{bill.uhid}</div>
                  </td>
                  <td><span className={clsx('badge', bill.bill_type === 'IPD' ? 'badge-info' : 'badge-neutral')}>{bill.bill_type}</span></td>
                  <td className="font-semibold text-slate-100">{formatCurrency(bill.net_amount, sym)}</td>
                  <td className="text-emerald-400">{formatCurrency(bill.paid_amount, sym)}</td>
                  <td>{balanceBadge(bill.balance_amount)}</td>
                  <td>{statusBadge(bill.status)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => viewBill(bill.id)} className="btn-ghost btn-icon btn-sm text-blue-400" title="View"><Eye size={15} /></button>
                      {bill.status !== 'Cancelled' && (
                        <button onClick={async () => {
                          const result = await window.api.billing.getBill(bill.id);
                          if (result.bill) setEditBill(result.bill);
                        }} className="btn-ghost btn-icon btn-sm text-amber-400" title="Edit Bill">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && bill.status === 'Finalized' && (
                        <button onClick={() => { setCancelDialog({ open: true, bill }); setCancelReason(''); }} className="btn-ghost btn-icon btn-sm text-red-400" title="Cancel"><XCircle size={15} /></button>
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

      {/* New Bill Modal - Multi-step */}
      <Modal isOpen={isNewBillOpen} onClose={() => setIsNewBillOpen(false)} title="Create New Bill" size="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <button className="btn-secondary" onClick={() => billStep > 1 ? setBillStep(billStep - 1) : setIsNewBillOpen(false)}>Back</button>
            <div className="flex gap-2">
              {billStep < 3 ? (
                <button className="btn-primary" onClick={() => {
                  if (billStep === 1 && !selectedPatient) { toast.error('Please select a patient'); return; }
                  if (billStep === 2 && fields.length === 0) { toast.error('Add at least one service'); return; }
                  setBillStep(billStep + 1);
                }}>Next →</button>
              ) : (
                <button className="btn-success" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                  {isSaving ? 'Saving...' : '✓ Save Bill'}
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Step indicator */}
        <div className="flex mb-6 gap-2">
          {['Patient', 'Services', 'Payment'].map((s, i) => (
            <div key={s} className={clsx('flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors', billStep > i + 1 ? 'bg-emerald-600/20 text-emerald-400' : billStep === i + 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500')}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        {/* Step 1: Patient & IPD/OPD Selection */}
        {billStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Bill Type</label>
                <select {...register('bill_type')} className="form-select">
                  <option value="IPD">IPD Bill</option>
                  <option value="OPD">OPD Bill</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Patient *</label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-100">{selectedPatient.patient_name}</p>
                    <p className="text-blue-400 text-xs">{selectedPatient.uhid} &bull; {selectedPatient.age} yrs &bull; {selectedPatient.gender}</p>
                  </div>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => { setSelectedPatient(null); setValue('patient_id', 0 as unknown as number); setIpdAdmissions([]); setOpdVisits([]); }}>Change</button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="form-input" placeholder="Search patient..." />
                  {patientResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {patientResults.map(p => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors">
                          <p className="text-slate-100 text-sm">{p.patient_name}</p>
                          <p className="text-slate-500 text-xs">{p.uhid} &bull; {p.age} yrs &bull; {p.gender}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedPatient && billType === 'IPD' && ipdAdmissions.length > 0 && (
              <div className="form-group">
                <label className="form-label">IPD Admission</label>
                <select {...register('ipd_id')} className="form-select">
                  <option value="">Select IPD</option>
                  {ipdAdmissions.map(a => <option key={a.id} value={a.id}>{a.ipd_number} – {formatDate(a.admission_date)}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Doctor</label>
              <select {...register('doctor_id')} className="form-select">
                <option value="">Select Doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.doctor_name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {billStep === 2 && (
          <div className="space-y-4">
            {/* Service search */}
            <div className="relative">
              <input
                type="text"
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="form-input pl-9"
                placeholder="Search and add service..."
                onFocus={() => setServiceResults(allServices.slice(0, 20))}
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              {serviceResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {serviceResults.map(svc => (
                    <button key={svc.id} type="button" onClick={() => addService(svc)} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors flex justify-between">
                      <div>
                        <p className="text-slate-100 text-sm">{svc.service_name}</p>
                        <p className="text-slate-500 text-xs">{svc.category_name} &bull; {svc.unit}</p>
                      </div>
                      <p className="text-emerald-400 text-sm font-semibold">{formatCurrency(svc.rate, sym)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={addCustomService} className="btn-ghost btn-sm"><Plus size={14} /> Add Custom Item</button>

            {/* Items table */}
            {fields.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Service</th><th className="w-20">Qty</th><th className="w-28">Rate (₹)</th><th className="w-28">Amount (₹)</th><th className="w-10"></th></tr></thead>
                  <tbody>
                    {fields.map((field, idx) => (
                      <tr key={field.id}>
                        <td>
                          <input {...register(`items.${idx}.service_name`)} className="form-input text-xs" placeholder="Service name" />
                        </td>
                        <td>
                          <input
                            {...register(`items.${idx}.quantity`)}
                            type="number" min="1"
                            className="form-input text-xs w-16"
                            onChange={e => { setValue(`items.${idx}.quantity`, Number(e.target.value)); updateItemAmount(idx); }}
                          />
                        </td>
                        <td>
                          <input
                            {...register(`items.${idx}.rate`)}
                            type="number" min="0" step="0.01"
                            className="form-input text-xs w-24"
                            onChange={e => { setValue(`items.${idx}.rate`, Number(e.target.value)); updateItemAmount(idx); }}
                          />
                        </td>
                        <td>
                          <input {...register(`items.${idx}.amount`)} type="number" min="0" step="0.01" className="form-input text-xs w-24 bg-slate-800" readOnly />
                        </td>
                        <td>
                          <button type="button" onClick={() => remove(idx)} className="btn-ghost btn-icon btn-sm text-red-400"><XCircle size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {fields.length === 0 && (
              <div className="text-center py-8 text-slate-500">No services added. Search above to add services.</div>
            )}

            {/* Discount */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="form-group">
                <label className="form-label">Discount %</label>
                <input {...register('discount_percent')} type="number" min="0" max="100" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Discount Amount (₹)</label>
                <input {...register('discount_amount')} type="number" min="0" step="0.01" className="form-input" disabled={watchDiscountPercent > 0} />
              </div>
            </div>

            {/* Totals */}
            <div className="bg-slate-900/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-100">{sym}{subtotal.toFixed(2)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Discount</span><span className="text-red-400">- {formatCurrency(discountAmt, sym)}</span></div>}
              {taxAmt > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Tax ({taxRate}%)</span><span className="text-slate-100">{formatCurrency(taxAmt, sym)}</span></div>}
              <div className="flex justify-between font-bold border-t border-slate-700 pt-2"><span className="text-slate-200">Net Amount</span><span className="text-emerald-400 text-lg">{formatCurrency(netAmount, sym)}</span></div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {billStep === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span>{sym}{subtotal.toFixed(2)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Discount</span><span className="text-red-400">- {formatCurrency(discountAmt, sym)}</span></div>}
              {taxAmt > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Tax</span><span>{formatCurrency(taxAmt, sym)}</span></div>}
              <div className="flex justify-between font-bold text-lg border-t border-slate-700 pt-2"><span className="text-white">Net Amount</span><span className="text-emerald-400">{formatCurrency(netAmount, sym)}</span></div>
            </div>

            <p className="text-xs text-slate-500 italic">{numberToWords(netAmount)}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Amount Paid Now (₹)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="form-input"
                  placeholder="0.00"
                  max={paiseToRupees(netAmount)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="form-select">
                  {['Cash','Card','UPI','Bank Transfer','Cheque','Other'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Net Amount</span><span>{formatCurrency(netAmount, sym)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Payment Now</span><span className="text-emerald-400">{sym}{paymentAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold border-t border-slate-700 pt-1 mt-1">
                <span className="text-slate-300">Balance</span>
                <span className={paymentAmount >= paiseToRupees(netAmount) ? 'text-emerald-400' : 'text-amber-400'}>
                  {formatCurrency(Math.max(0, netAmount - rupeesToPaise(paymentAmount)), sym)}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea {...register('notes')} className="form-input" rows={2} placeholder="Optional notes" />
            </div>
          </div>
        )}
      </Modal>

      {/* Bill Preview/Print Modal */}
      {previewBill && (
        <Modal isOpen={!!previewBill} onClose={() => setPreviewBill(null)} title={`Bill: ${previewBill.bill_number}`} size="4xl"
          footer={
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setPreviewBill(null)}>Close</button>
              {previewBill.balance_amount > 0 && (
                <button className="btn-warning" onClick={async () => {
                  const amt = prompt('Enter payment amount (₹):');
                  if (!amt) return;
                  const result = await window.api.billing.addPayment({ bill_id: previewBill.id, patient_id: previewBill.patient_id, amount: rupeesToPaise(Number(amt)), payment_mode: 'Cash' });
                  if (result.success) { toast.success(`Payment recorded: ${result.receipt_number}`); loadBills(); const updated = await window.api.billing.getBill(previewBill.id); if (updated.bill) setPreviewBill(updated.bill); }
                  else toast.error(result.error || 'Failed');
                }}>+ Payment</button>
              )}
              {/* ── Download PDF — save to chosen location for WhatsApp sharing ── */}
              <button className="btn-success" onClick={async () => {
                const el = document.getElementById('bill-preview');
                if (!el) { toast.error('Bill not ready'); return; }
                // Step 1: Show Save dialog → get file path
                const saveResult = await window.api.print.savePdf(previewBill.id);
                if (!saveResult.success || !saveResult.filePath) return; // user cancelled
                // Step 2: Render PDF to that path
                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
                  <title>Bill - ${previewBill.bill_number}</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { margin: 0; padding: 0; width: 100%; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Segoe UI', Arial, sans-serif; }
                    @page { size: A4 portrait; margin: 0; }
                    #bill-preview { width: 100%; display: block; }
                    img { max-width: 100%; display: block; }
                  </style>
                </head><body>${el.outerHTML}</body></html>`;
                toast.loading('Saving PDF...', { id: 'save-pdf' });
                const result = await window.api.print.printHtmlContent(html, saveResult.filePath);
                toast.dismiss('save-pdf');
                if (result.success) {
                  toast.success('✅ PDF saved! Now share it on WhatsApp or anywhere.', { duration: 5000 });
                  // Open the saved file so user can verify
                  await window.api.app.openPath(result.filePath!);
                } else {
                  toast.error(result.error || 'Save failed');
                }
              }}><FileDown size={16} /> Download PDF</button>
              <button className="btn-primary" onClick={async () => {
                const el = document.getElementById('bill-preview');
                if (!el) { toast.error('Bill not ready'); return; }
                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
                  <title>Bill - ${previewBill.bill_number}</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { margin: 0; padding: 0; width: 100%; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Segoe UI', Arial, sans-serif; }
                    @page { size: A4 portrait; margin: 0; }
                    #bill-preview { width: 100%; display: block; }
                    img { max-width: 100%; display: block; }
                  </style>
                </head><body>${el.outerHTML}</body></html>`;
                toast.loading('Generating PDF...', { id: 'print' });
                const result = await window.api.print.printHtmlContent(html);
                toast.dismiss('print');
                if (result.success) toast.success('PDF opened — print from your PDF viewer!');
                else toast.error(result.error || 'Print failed');
              }}><Printer size={16} /> Print</button>
            </div>
          }
        >
          <div className="overflow-y-auto" style={{ maxHeight: '75vh' }}>
            <BillPreview bill={previewBill} settings={settings} />
          </div>
        </Modal>
      )}

      {/* Cancel Dialog */}
      <Modal isOpen={cancelDialog.open} onClose={() => setCancelDialog({ open: false, bill: null })} title="Cancel Bill" size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCancelDialog({ open: false, bill: null })}>Back</button>
            <button className="btn-danger" onClick={cancelBill} disabled={isCancelling}>{isCancelling ? 'Cancelling...' : 'Cancel Bill'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-slate-300 text-sm">Cancelling: <span className="font-mono text-blue-400">{cancelDialog.bill?.bill_number}</span></p>
          <div className="form-group">
            <label className="form-label">Cancellation Reason *</label>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="form-input" rows={3} placeholder="Enter reason for cancellation" />
          </div>
        </div>
      </Modal>

      {/* ═══ EDIT BILL MODAL ═══ */}
      {editBill && (
        <EditBillModal
          bill={editBill}
          sym={sym}
          isLoading={isEditSaving}
          onClose={() => setEditBill(null)}
          onSave={async (updatedData) => {
            setIsEditSaving(true);
            const result = await window.api.billing.updateBill(editBill.id, updatedData);
            setIsEditSaving(false);
            if (result.success) {
              toast.success('Bill updated successfully!');
              setEditBill(null);
              loadBills();
            } else {
              toast.error(result.error || 'Failed to update bill');
            }
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   EDIT BILL MODAL — Standalone Component
   ══════════════════════════════════════════ */
interface EditItem {
  service_id: number | null;
  service_name: string;
  quantity: number;
  rate: number;
  amount: number;
  notes: string;
  sort_order: number;
}

interface EditBillModalProps {
  bill: import('../../types').Bill;
  sym: string;
  isLoading: boolean;
  onClose: () => void;
  onSave: (data: object) => void;
}

function EditBillModal({ bill, sym, isLoading, onClose, onSave }: EditBillModalProps) {
  const [items, setItems] = useState<EditItem[]>(
    (bill.items || []).map((it, i) => ({
      service_id: it.service_id,
      service_name: it.service_name,
      quantity: it.quantity,
      rate: it.rate / 100,          // paise → rupees for display
      amount: it.amount / 100,
      notes: it.notes || '',
      sort_order: i,
    }))
  );
  const [discountPercent, setDiscountPercent] = useState(bill.discount_percent || 0);
  const [notes, setNotes] = useState(bill.notes || '');

  // Recalculate on item/discount change
  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const discountAmt = parseFloat(((subtotal * discountPercent) / 100).toFixed(2));
  const netAmount = parseFloat((subtotal - discountAmt).toFixed(2));

  function updateItem(idx: number, field: keyof EditItem, val: string | number) {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'quantity' || field === 'rate') {
        next[idx].amount = parseFloat((Number(next[idx].quantity) * Number(next[idx].rate)).toFixed(2));
      }
      return next;
    });
  }

  function addItem() {
    setItems(prev => [...prev, { service_id: null, service_name: '', quantity: 1, rate: 0, amount: 0, notes: '', sort_order: prev.length }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (items.length === 0) { return; }
    const payload = {
      doctor_id: bill.doctor_id,
      subtotal: Math.round(subtotal * 100),           // back to paise
      discount_amount: Math.round(discountAmt * 100),
      discount_percent: discountPercent,
      tax_amount: 0,
      net_amount: Math.round(netAmount * 100),
      balance_amount: Math.round(netAmount * 100),
      notes,
      items: items.map((it, i) => ({
        service_id: it.service_id,
        service_name: it.service_name,
        quantity: it.quantity,
        rate: Math.round(it.rate * 100),
        amount: Math.round(it.amount * 100),
        notes: it.notes || null,
        sort_order: i,
      })),
    };
    onSave(payload);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Edit Bill — ${bill.bill_number}`}
      size="4xl"
      footer={
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={isLoading || items.length === 0}>
            {isLoading ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {/* Patient info (read-only) */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/50 rounded-lg text-sm">
          <div><span className="text-slate-500">Patient: </span><span className="text-slate-200 font-medium">{bill.patient_name}</span></div>
          <div><span className="text-slate-500">UHID: </span><span className="text-slate-200 font-mono text-xs">{bill.uhid}</span></div>
          <div><span className="text-slate-500">Type: </span><span className="text-blue-400 font-medium">{bill.bill_type}</span></div>
        </div>

        {/* Services Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Services &amp; Charges</h3>
            <button type="button" onClick={addItem} className="btn-ghost btn-sm text-blue-400">
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium">Service Name</th>
                  <th className="px-2 py-2 text-center text-xs text-slate-400 font-medium w-20">Qty</th>
                  <th className="px-2 py-2 text-center text-xs text-slate-400 font-medium w-28">Rate ({sym})</th>
                  <th className="px-2 py-2 text-center text-xs text-slate-400 font-medium w-28">Amount ({sym})</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map((item, idx) => (
                  <tr key={idx} className="bg-slate-900/50">
                    <td className="px-2 py-1.5">
                      <input
                        value={item.service_name}
                        onChange={e => updateItem(idx, 'service_name', e.target.value)}
                        className="form-input text-xs w-full"
                        placeholder="Service name"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="form-input text-xs w-16 text-center"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.01"
                        value={item.rate}
                        onChange={e => updateItem(idx, 'rate', Number(e.target.value))}
                        className="form-input text-xs w-24 text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" value={item.amount.toFixed(2)}
                        className="form-input text-xs w-24 text-right bg-slate-800 cursor-not-allowed"
                        readOnly
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <button type="button" onClick={() => removeItem(idx)} className="btn-ghost btn-icon btn-sm text-red-400">
                        <XCircle size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-slate-500">No items. Click "Add Item" to add a service.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discount + Notes + Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="form-group">
              <label className="form-label">Discount %</label>
              <input
                type="number" min="0" max="100" step="0.5"
                value={discountPercent}
                onChange={e => setDiscountPercent(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Remarks</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="form-input" rows={2}
                placeholder="Optional notes"
              />
            </div>
          </div>

          {/* Live summary */}
          <div className="bg-slate-800/60 rounded-lg p-4 space-y-2 text-sm self-start">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{sym} {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Discount ({discountPercent}%)</span>
                <span className="font-mono">- {sym} {discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-400 font-bold border-t border-slate-700 pt-2">
              <span>Net Amount</span>
              <span className="font-mono">{sym} {netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-emerald-400 text-xs">
              <span>Already Paid</span>
              <span className="font-mono">{sym} {(bill.paid_amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-amber-400 font-semibold text-xs border-t border-slate-700 pt-1">
              <span>New Balance</span>
              <span className="font-mono">{sym} {Math.max(0, netAmount - bill.paid_amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
