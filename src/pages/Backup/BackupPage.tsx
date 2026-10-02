import { useState, useEffect } from 'react';
import { Database, Download, Upload, FolderOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface BackupFile { name: string; path: string; size: number; created: Date; }

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const loadBackups = async () => {
    const result = await window.api.backup.listBackups();
    if (result.success) setBackups(result.files);
  };

  useEffect(() => { loadBackups(); }, []);

  const createBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await window.api.backup.create();
      if (result.success) {
        toast.success(`Backup created: ${result.filePath?.split('\\').pop()}`);
        loadBackups();
      } else toast.error(result.error || 'Backup failed');
    } catch { toast.error('Backup failed'); }
    finally { setIsBackingUp(false); }
  };

  const selectRestoreFile = async () => {
    const result = await window.api.backup.selectFile();
    if (result.success && result.filePath) {
      setRestoreFile(result.filePath);
      setConfirmRestore(true);
    }
  };

  const doRestore = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    try {
      const result = await window.api.backup.restore(restoreFile);
      if (result.success) {
        toast.success('Database restored successfully! Please restart the application.');
        setConfirmRestore(false);
        setRestoreFile(null);
        loadBackups();
      } else toast.error(result.error || 'Restore failed');
    } catch { toast.error('Restore failed'); }
    finally { setIsRestoring(false); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><Database size={24} className="text-blue-400" /> Backup & Restore</h1>
          <p className="page-subtitle">Manage local database backups</p></div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-300 font-medium text-sm">Important: Local Backups Only</p>
          <p className="text-amber-400/80 text-xs mt-1">All backups are stored locally on this computer. Do NOT delete backup files. Keep backups on an external drive or USB for safety.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center mb-4">
            <Download size={22} className="text-emerald-400" />
          </div>
          <h3 className="font-semibold text-white mb-1">Create Backup</h3>
          <p className="text-slate-400 text-sm mb-4">Save a copy of the complete database to a local folder. You can choose the destination folder.</p>
          <button onClick={createBackup} disabled={isBackingUp} className="btn-success">
            {isBackingUp ? 'Creating Backup...' : 'Backup Now'}
          </button>
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
            <Upload size={22} className="text-blue-400" />
          </div>
          <h3 className="font-semibold text-white mb-1">Restore Database</h3>
          <p className="text-slate-400 text-sm mb-4">Replace the current database with a backup file. A safety backup is created automatically before restoring.</p>
          <button onClick={selectRestoreFile} disabled={isRestoring} className="btn-warning">
            {isRestoring ? 'Restoring...' : 'Restore from File'}
          </button>
        </div>
      </div>

      {/* Backup List */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-100">Backup History ({backups.length})</h3>
          <button onClick={loadBackups} className="btn-ghost btn-sm">Refresh</button>
        </div>
        {backups.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No backups found in default backup directory</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Filename</th><th>Size</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.path}>
                    <td><div className="flex items-center gap-2"><Database size={14} className="text-blue-400" /><span className="font-mono text-xs text-slate-300">{b.name}</span></div></td>
                    <td className="text-slate-400 text-xs">{formatSize(b.size)}</td>
                    <td className="text-slate-400 text-xs">{new Date(b.created).toLocaleString('en-IN')}</td>
                    <td>
                      <button onClick={() => { setRestoreFile(b.path); setConfirmRestore(true); }} className="btn-ghost btn-sm text-blue-400">Restore This</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={doRestore}
        title="Confirm Database Restore"
        message={`Are you sure you want to restore from: ${restoreFile?.split('\\').pop()}? A safety backup will be created first. All current data will be replaced with the backup data.`}
        confirmLabel="Restore Database"
        isLoading={isRestoring}
      />
    </div>
  );
}
