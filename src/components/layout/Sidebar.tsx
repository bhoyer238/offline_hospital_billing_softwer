import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Bed, FileText, Stethoscope,
  CreditCard, BarChart3, Settings, Shield, Database, ClipboardList,
  LogOut, UserCog, Heart
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { path: '/patients', label: 'Patients', icon: Users, adminOnly: false },
  { path: '/opd', label: 'OPD', icon: Activity, adminOnly: false },
  { path: '/ipd', label: 'IPD', icon: Bed, adminOnly: false },
  { path: '/billing', label: 'Billing', icon: FileText, adminOnly: false },
  { path: '/payments', label: 'Payments', icon: CreditCard, adminOnly: false },
  { path: '/doctors', label: 'Doctors', icon: Stethoscope, adminOnly: false },
  { path: '/services', label: 'Services', icon: ClipboardList, adminOnly: false },
  { path: '/reports', label: 'Reports', icon: BarChart3, adminOnly: false },
  { path: '/users', label: 'Users', icon: UserCog, adminOnly: true },
  { path: '/audit', label: 'Audit Logs', icon: Shield, adminOnly: true },
  { path: '/backup', label: 'Backup', icon: Database, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout, settings } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    await window.api.auth.logout();
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role_name === 'admin');
  const hospitalName = settings?.hospital_name || 'Hospital Billing';

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <Heart size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate" title={hospitalName}>
              {hospitalName}
            </p>
            <p className="text-xs text-slate-500">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx('sidebar-item', isActive && 'active')
            }
          >
            <item.icon size={17} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 bg-blue-600/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 text-sm font-semibold">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role_name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <LogOut size={17} />
          <span>Logout</span>
        </button>
        <p className="text-center text-xs text-slate-700 mt-3 select-none">v1.0.0</p>
      </div>
    </aside>
  );
}
