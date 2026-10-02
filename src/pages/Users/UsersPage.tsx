import { useState, useEffect } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import type { User } from '../../types';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

const createSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscore'),
  password: z.string().min(6, 'Min 6 characters'),
  role_id: z.coerce.number().min(1),
});

const editSchema = z.object({
  full_name: z.string().min(2),
  role_id: z.coerce.number().min(1),
});

const pwSchema = z.object({
  newPassword: z.string().min(6),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type CreateData = z.infer<typeof createSchema>;
type EditData = z.infer<typeof editSchema>;
type PwData = z.infer<typeof pwSchema>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string; display_name: string }>>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { errors: errCreate } } = useForm<CreateData>({ resolver: zodResolver(createSchema), defaultValues: { role_id: 2 } });
  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit, formState: { errors: errEdit } } = useForm<EditData>({ resolver: zodResolver(editSchema) });
  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: errPw } } = useForm<PwData>({ resolver: zodResolver(pwSchema) });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [u, r] = await Promise.all([window.api.users.getAll(), window.api.users.getRoles()]);
    setUsers(u.users || []);
    setRoles(r.roles || []);
  };

  const onCreate = async (data: CreateData) => {
    setIsSaving(true);
    try {
      const result = await window.api.users.create(data);
      if (result.success) { toast.success('User created'); setIsAddOpen(false); resetCreate(); load(); }
      else toast.error(result.error || 'Failed');
    } catch { toast.error('Error'); } finally { setIsSaving(false); }
  };

  const onEdit = async (data: EditData) => {
    if (!editUser) return;
    setIsSaving(true);
    try {
      const result = await window.api.users.update(editUser.id, data);
      if (result.success) { toast.success('User updated'); setEditUser(null); load(); }
      else toast.error(result.error || 'Failed');
    } catch { toast.error('Error'); } finally { setIsSaving(false); }
  };

  const onResetPw = async (data: PwData) => {
    if (!pwUser) return;
    setIsSaving(true);
    try {
      const result = await window.api.users.resetPassword(pwUser.id, data.newPassword);
      if (result.success) { toast.success('Password reset successfully'); setPwUser(null); resetPw(); }
      else toast.error(result.error || 'Failed');
    } catch { toast.error('Error'); } finally { setIsSaving(false); }
  };

  const toggleStatus = async (user: User) => {
    const result = await window.api.users.toggleStatus(user.id, !user.is_active);
    if (result.success) { toast.success(user.is_active ? 'User deactivated' : 'User activated'); load(); }
    else toast.error('Failed');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">User Management</h1><p className="page-subtitle">{users.length} users</p></div>
        <button onClick={() => { resetCreate({ role_id: 2 }); setIsAddOpen(true); }} className="btn-primary"><Plus size={18} /> Add User</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="font-medium text-slate-100">{user.full_name}</td>
                  <td className="font-mono text-sm text-slate-400">{user.username}</td>
                  <td><span className={user.role_name === 'admin' ? 'badge-info' : 'badge-neutral'}>{user.role_name === 'admin' ? 'Admin' : 'Receptionist'}</span></td>
                  <td>{user.is_active ? <span className="badge-success">Active</span> : <span className="badge-danger">Inactive</span>}</td>
                  <td className="text-xs text-slate-500">{user.last_login ? formatDateTime(user.last_login) : 'Never'}</td>
                  <td className="text-xs text-slate-500">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditUser(user); resetEdit({ full_name: user.full_name, role_id: user.role_id }); }} className="btn-ghost btn-icon btn-sm text-blue-400"><Edit2 size={15} /></button>
                      <button onClick={() => { setPwUser(user); resetPw(); }} className="btn-ghost btn-icon btn-sm text-amber-400" title="Reset Password"><KeyRound size={15} /></button>
                      <button onClick={() => toggleStatus(user)} className="btn-ghost btn-icon btn-sm">{user.is_active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-slate-500" />}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New User" size="md"
        footer={<><button className="btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleCreate(onCreate)} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create User'}</button></>}
      >
        <form className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2"><label className="form-label">Full Name *</label><input {...regCreate('full_name')} className="form-input" autoFocus />{errCreate.full_name && <p className="form-error">{errCreate.full_name.message}</p>}</div>
          <div className="form-group"><label className="form-label">Username *</label><input {...regCreate('username')} className="form-input" />{errCreate.username && <p className="form-error">{errCreate.username.message}</p>}</div>
          <div className="form-group"><label className="form-label">Role</label><select {...regCreate('role_id')} className="form-select">{roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select></div>
          <div className="form-group col-span-2"><label className="form-label">Password *</label><input {...regCreate('password')} type="password" className="form-input" />{errCreate.password && <p className="form-error">{errCreate.password.message}</p>}</div>
        </form>
      </Modal>

      {/* Edit User */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="md"
        footer={<><button className="btn-secondary" onClick={() => setEditUser(null)}>Cancel</button><button className="btn-primary" onClick={handleEdit(onEdit)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></>}
      >
        <form className="space-y-4">
          <div className="form-group"><label className="form-label">Full Name *</label><input {...regEdit('full_name')} className="form-input" />{errEdit.full_name && <p className="form-error">{errEdit.full_name.message}</p>}</div>
          <div className="form-group"><label className="form-label">Role</label><select {...regEdit('role_id')} className="form-select">{roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select></div>
        </form>
      </Modal>

      {/* Reset Password */}
      <Modal isOpen={!!pwUser} onClose={() => setPwUser(null)} title={`Reset Password — ${pwUser?.username}`} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setPwUser(null)}>Cancel</button><button className="btn-primary" onClick={handlePw(onResetPw)} disabled={isSaving}>{isSaving ? 'Resetting...' : 'Reset Password'}</button></>}
      >
        <form className="space-y-4">
          <div className="form-group"><label className="form-label">New Password *</label><input {...regPw('newPassword')} type="password" className="form-input" autoFocus />{errPw.newPassword && <p className="form-error">{errPw.newPassword.message}</p>}</div>
          <div className="form-group"><label className="form-label">Confirm Password *</label><input {...regPw('confirmPassword')} type="password" className="form-input" />{errPw.confirmPassword && <p className="form-error">{errPw.confirmPassword.message}</p>}</div>
        </form>
      </Modal>
    </div>
  );
}
