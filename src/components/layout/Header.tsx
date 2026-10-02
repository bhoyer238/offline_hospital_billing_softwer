import { Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';

export default function Header() {
  const { user, settings } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="bg-slate-800/50 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between flex-shrink-0 backdrop-blur-sm">
      <div>
        <h1 className="text-base font-semibold text-white">
          {settings?.hospital_name || 'Hospital Billing System'}
        </h1>
        <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-all duration-200"
        >
          {theme === 'dark'
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} className="text-blue-500" />
          }
        </button>

        <div className="w-px h-6 bg-slate-700/50" />

        <div className="text-right">
          <p className="text-sm font-medium text-slate-200">{user?.full_name}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role_name}</p>
        </div>
        <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center">
          <span className="text-blue-400 font-semibold text-sm">{user?.full_name?.[0]?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
