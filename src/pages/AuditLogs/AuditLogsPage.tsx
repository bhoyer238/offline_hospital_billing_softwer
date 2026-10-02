import { useState, useEffect, useCallback } from 'react';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import type { AuditLog } from '../../types';
import { formatDateTime, today, daysAgo } from '../../utils/dateUtils';
import { Shield } from 'lucide-react';
import clsx from 'clsx';

const PAGE_SIZE = 50;

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'badge-success',
  LOGOUT: 'badge-neutral',
  CREATE: 'badge-info',
  UPDATE: 'badge-warning',
  DELETE: 'badge-danger',
  CANCEL: 'badge-danger',
  PAYMENT: 'badge-success',
  PRINT: 'badge-neutral',
  BACKUP: 'badge-info',
  RESTORE: 'badge-warning',
  RESET_PASSWORD: 'badge-warning',
  ACTIVATE: 'badge-success',
  DEACTIVATE: 'badge-danger',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgo(7));
  const [dateTo, setDateTo] = useState(today());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.audit.getLogs({ search: search || undefined, module: moduleFilter || undefined, dateFrom, dateTo }, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setLogs(result.logs);
      setTotal(result.total);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [search, moduleFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const modules = ['Auth', 'Patient', 'OPD', 'IPD', 'Billing', 'Service', 'Doctor', 'User', 'Settings', 'Backup'];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Shield size={24} className="text-blue-400" /> Audit Logs</h1>
          <p className="page-subtitle">{total} log entries</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header gap-4 flex-wrap">
          <SearchInput value={search} onChange={val => { setSearch(val); setPage(1); }} placeholder="Search logs..." className="w-56" />
          <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }} className="form-select w-32">
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" />
            <span className="text-slate-500">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input" />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Module</th><th>Description</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-slate-500">Loading...</td></tr>
              : logs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-500">No logs found</td></tr>
              : logs.map(log => (
                <tr key={log.id}>
                  <td className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="text-slate-300">{log.username || '-'}</td>
                  <td><span className={clsx('badge', ACTION_COLORS[log.action] || 'badge-neutral')}>{log.action}</span></td>
                  <td className="text-slate-400">{log.module}</td>
                  <td className="text-slate-300 text-xs max-w-xs truncate">{log.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
