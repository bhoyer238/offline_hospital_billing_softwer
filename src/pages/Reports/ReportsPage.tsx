import { useState } from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, paiseToRupees } from '../../utils/currency';
import { today, startOfMonth, currentYear } from '../../utils/dateUtils';
import { useAuthStore } from '../../store/auth.store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import clsx from 'clsx';

type ReportType = 'daily' | 'monthly' | 'pending' | 'services' | 'doctors' | 'patients' | 'ipd' | 'opd' | 'cancelled';

const reports: { id: ReportType; label: string; description: string }[] = [
  { id: 'daily', label: 'Daily Collection', description: 'Revenue collected per day' },
  { id: 'monthly', label: 'Monthly Collection', description: 'Month-wise revenue summary' },
  { id: 'pending', label: 'Pending Payments', description: 'Bills with outstanding balance' },
  { id: 'services', label: 'Service Revenue', description: 'Revenue by service type' },
  { id: 'doctors', label: 'Doctor Revenue', description: 'Revenue attributed to doctors' },
  { id: 'patients', label: 'Patient Report', description: 'Patients registered in date range' },
  { id: 'ipd', label: 'IPD Report', description: 'IPD admissions in date range' },
  { id: 'opd', label: 'OPD Report', description: 'OPD visits in date range' },
  { id: 'cancelled', label: 'Cancelled Bills', description: 'Bills cancelled in date range' },
];

/**
 * DB amounts are stored as INTEGER paise (₹1 = 100 paise).
 * Detect currency/amount columns case-insensitively so formatCurrency is applied correctly.
 * SQL report aliases are Title Case (e.g. "Total", "Net Amount") — old lowercase check missed them.
 */
function isCurrencyCol(col: string): boolean {
  const lower = col.toLowerCase();
  return lower.includes('amount') || lower.includes('total') || lower.includes('paid')
    || lower.includes('balance') || lower.includes('collected')
    || lower === 'cash' || lower === 'card' || lower === 'upi' || lower === 'bank transfer';
}


export default function ReportsPage() {
  const { settings } = useAuthStore();
  const sym = settings?.currency_symbol || '₹';
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [year, setYear] = useState(currentYear());
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runReport = async () => {
    setIsLoading(true);
    setHasRun(true);
    try {
      let result: { success: boolean; data: Record<string, unknown>[] };
      switch (activeReport) {
        case 'daily': result = await window.api.reports.dailyCollection(dateFrom, dateTo); break;
        case 'monthly': result = await window.api.reports.monthlyCollection(year); break;
        case 'pending': result = await window.api.reports.pendingPayments(dateFrom, dateTo); break;
        case 'services': result = await window.api.reports.serviceRevenue(dateFrom, dateTo); break;
        case 'doctors': result = await window.api.reports.doctorRevenue(dateFrom, dateTo); break;
        case 'patients': result = await window.api.reports.patients(dateFrom, dateTo); break;
        case 'ipd': result = await window.api.reports.ipd(dateFrom, dateTo); break;
        case 'opd': result = await window.api.reports.opd(dateFrom, dateTo); break;
        case 'cancelled': result = await window.api.reports.cancelledBills(dateFrom, dateTo); break;
        default: result = { success: false, data: [] };
      }
      setReportData(result.data || []);
    } catch { toast.error('Failed to load report'); }
    finally { setIsLoading(false); }
  };

  const exportCsv = async () => {
    if (!reportData.length) { toast.error('No data to export'); return; }
    const filename = `${activeReport}_report_${dateFrom}_to_${dateTo}.csv`;
    const result = await window.api.reports.exportCsv(reportData, filename);
    if (result.success) toast.success(`Exported to: ${result.filePath}`);
    else toast.error(result.error || 'Export failed');
  };

  const isAmountReport = ['daily', 'monthly', 'services', 'doctors', 'pending'].includes(activeReport);

  const renderChart = () => {
    if (!reportData.length) return null;
    if (activeReport === 'daily') {
      return (
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {/* SQL alias is "Total" (Title Case) — map to 'amount' in rupees for chart */}
            <BarChart data={reportData.map(d => ({ ...d, amount: paiseToRupees(Number(d['Total'] || d['Amount'] || 0)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="Date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [formatCurrency(v * 100, sym), 'Collection']} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    if (activeReport === 'monthly') {
      return (
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {/* SQL alias is "Total" (Title Case) */}
            <LineChart data={reportData.map(d => ({ ...d, amount: paiseToRupees(Number(d['Total'] || 0)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="Month" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [formatCurrency(v * 100, sym), 'Collection']} />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    return null;
  };

  const renderTableHeaders = (): string[] => {
    if (!reportData.length) return [];
    return Object.keys(reportData[0]);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><BarChart3 size={24} className="text-blue-400" /> Reports</h1><p className="page-subtitle">Generate and export hospital reports</p></div>
        {hasRun && reportData.length > 0 && (
          <button onClick={exportCsv} className="btn-secondary"><Download size={16} /> Export CSV</button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Report selector */}
        <div className="col-span-3 space-y-1">
          {reports.map(r => (
            <button key={r.id} onClick={() => { setActiveReport(r.id); setHasRun(false); setReportData([]); }}
              className={clsx('w-full text-left px-3 py-3 rounded-lg transition-all duration-150 text-sm', activeReport === r.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800')}>
              <div className="font-medium">{r.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{r.description}</div>
            </button>
          ))}
        </div>

        {/* Report area */}
        <div className="col-span-9 space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Calendar size={16} className="text-slate-400" />
              {activeReport === 'monthly' ? (
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-select w-28">
                    {Array.from({ length: 5 }, (_, i) => currentYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="form-group">
                    <label className="form-label">From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input" />
                  </div>
                </div>
              )}
              <button onClick={runReport} disabled={isLoading} className="btn-primary self-end">
                {isLoading ? 'Loading...' : 'Run Report'}
              </button>
            </div>
          </div>

          {hasRun && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-slate-100">{reports.find(r => r.id === activeReport)?.label}</h3>
                <span className="text-slate-400 text-sm">{reportData.length} records</span>
              </div>

              {renderChart()}

              <div className="table-container">
                {reportData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No data for the selected period</div>
                ) : (
                  <table className="table">
                    <thead><tr>{renderTableHeaders().map(h => <th key={h}>{h.replace(/_/g, ' ').toUpperCase()}</th>)}</tr></thead>
                    <tbody>
                      {reportData.map((row, idx) => (
                        <tr key={idx}>
                          {renderTableHeaders().map(h => (
                            <td key={h}>
                              {typeof row[h] === 'number' && isCurrencyCol(h) && h !== 'id'
                                ? formatCurrency(Number(row[h]), sym)
                                : String(row[h] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
