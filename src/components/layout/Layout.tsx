import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';

export default function Layout() {
  const { setSettings } = useAuthStore();

  useEffect(() => {
    async function loadSettings() {
      try {
        const result = await window.api.settings.get();
        if (result.success) setSettings(result.settings);
      } catch { /* ignore */ }
    }
    loadSettings();
  }, [setSettings]);

  return (
    <div className="flex h-full bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
