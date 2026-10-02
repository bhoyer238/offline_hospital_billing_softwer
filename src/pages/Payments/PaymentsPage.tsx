import { useState, useEffect, useCallback } from 'react';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import type { Bill, Payment } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { formatDate, formatDateTime, today } from '../../utils/dateUtils';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import { CreditCard, Plus } from 'lucide-react';

const PAGE_SIZE = 20;

export default function PaymentsPage() {
  const { settings } = useAuthStore();
  const sym = settings?.currency_symbol || '₹';
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.billing.searchBills(search, { status: 'Finalized' }, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setBills(result.bills);
      setTotal(result.total);
    } catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  }, [search, page]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const openBill = async (bill: Bill) => {
    setSelectedBill(bill);
    const result = await window.api.billing.getBillPayments(bill.id);
    setPayments(result.payments || []);
    setPayAmount(paiseToRupees(bill.balance_amount).toFixed(2));
    setPayMode('Cash');
    setPayNotes('');
    setIsPaymentOpen(true);
  };

  const addPayment = async () => {
    if (!selectedBill) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > paiseToRupees(selectedBill.balance_amount)) { toast.error('Amount exceeds balance'); return; }
    setIsSaving(true);
    try {
      const result = await window.api.billing.addPayment({
        bill_id: selectedBill.id,
        patient_id: selectedBill.patient_id,
        amount: rupeesToPaise(amount),
        payment_mode: payMode,
        notes: payNotes || null,
      });
      if (result.success) {
        toast.success(`Payment recorded! Receipt: ${result.receipt_number}`);
        const updated = await window.api.billing.getBill(selectedBill.id);
        if (updated.bill) setSelectedBill(updated.bill);
        const pmts = await window.api.billing.getBillPayments(selectedBill.id);
        setPayments(pmts.payments || []);
        setPayAmount('');
        loadBills();
      } else toast.error(result.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Payment Management</h1><p className="page-subtitle">Track and record payments for finalized bills</p></div>
      </div>
      <div className="card">
        <div className="card-header">
          <SearchInput value={search} onChange={val => { setSearch(val); setPage(1); }} placeholder="Search bills..." className="w-72" />
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Bill No.</th><th>Patient</th><th>Date</th><th>Net Amount</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead>
            <tbody>
              {isLoading ? (<tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td></tr>)
              : bills.length === 0 ? (<tr><td colSpan={7} className="text-center py-8 text-slate-500">No bills found</td></tr>)
              : bills.map(bill => (
                <tr key={bill.id}>
                  <td><span className="font-mono text-blue-400 text-xs">{bill.bill_number}</span></td>
                  <td><div className="font-medium text-slate-100">{bill.patient_name}</div><div className="text-xs text-slate-500">{bill.uhid}</div></td>
                  <td className="text-xs text-slate-400">{formatDate(bill.bill_date)}</td>
                  <td className="font-semibold">{formatCurrency(bill.net_amount, sym)}</td>
                  <td className="text-emerald-400">{formatCurrency(bill.paid_amount, sym)}</td>
                  <td className={bill.balance_amount > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>{formatCurrency(bill.balance_amount, sym)}</td>
                  <td>
                    <button onClick={() => openBill(bill)} className="btn-primary btn-sm">
                      <CreditCard size={13} /> {bill.balance_amount > 0 ? 'Pay' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title={`Payments — ${selectedBill?.bill_number}`} size="xl"
        footer={<button className="btn-secondary" onClick={() => setIsPaymentOpen(false)}>Close</button>}
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-500">Net Amount</p>
                <p className="font-bold text-slate-100">{formatCurrency(selectedBill.net_amount, sym)}</p>
              </div>
              <div className="p-3 bg-emerald-900/20 rounded-lg">
                <p className="text-xs text-slate-500">Paid</p>
                <p className="font-bold text-emerald-400">{formatCurrency(selectedBill.paid_amount, sym)}</p>
              </div>
              <div className="p-3 bg-amber-900/20 rounded-lg">
                <p className="text-xs text-slate-500">Balance</p>
                <p className={`font-bold ${selectedBill.balance_amount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{formatCurrency(selectedBill.balance_amount, sym)}</p>
              </div>
            </div>

            {selectedBill.balance_amount > 0 && (
              <div className="card p-4">
                <h4 className="font-semibold text-slate-100 mb-3 flex items-center gap-2"><Plus size={16} /> Add Payment</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="form-input" min="0" max={paiseToRupees(selectedBill.balance_amount)} step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)} className="form-select">
                      {['Cash','Card','UPI','Bank Transfer','Cheque','Other'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Notes</label>
                    <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} className="form-input" placeholder="Optional" />
                  </div>
                </div>
                <button onClick={addPayment} disabled={isSaving} className="btn-success mt-3">
                  {isSaving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-slate-100 mb-2">Payment History</h4>
              {payments.length === 0 ? <p className="text-slate-500 text-sm">No payments recorded</p> : (
                <table className="table">
                  <thead><tr><th>Receipt No.</th><th>Date</th><th>Amount</th><th>Mode</th><th>Received By</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td><span className="font-mono text-blue-400 text-xs">{p.receipt_number}</span></td>
                        <td className="text-xs text-slate-400">{formatDate(p.payment_date)}</td>
                        <td className="font-semibold text-emerald-400">{formatCurrency(p.amount, sym)}</td>
                        <td>{p.payment_mode}</td>
                        <td>{p.receiver_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
