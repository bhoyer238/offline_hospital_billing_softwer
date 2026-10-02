import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/auth.store';
import { useThemeStore } from './store/theme.store';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import SetupPage from './pages/Setup/SetupPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import PatientsPage from './pages/Patients/PatientsPage';
import OpdPage from './pages/OPD/OpdPage';
import IpdPage from './pages/IPD/IpdPage';
import BillingPage from './pages/Billing/BillingPage';
import ServicesPage from './pages/Services/ServicesPage';
import DoctorsPage from './pages/Doctors/DoctorsPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import UsersPage from './pages/Users/UsersPage';
import AuditLogsPage from './pages/AuditLogs/AuditLogsPage';
import BackupPage from './pages/Backup/BackupPage';
import SettingsPage from './pages/Settings/SettingsPage';
import LoadingScreen from './components/ui/LoadingScreen';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role_name !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  const [isChecking, setIsChecking] = useState(true);
  const [setupComplete, setSetupComplete] = useState(true);
  const { isAuthenticated, checkSessionTimeout, logout } = useAuthStore();
  const { theme } = useThemeStore();

  // Apply theme class to <html> element
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light');
    } else {
      html.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    async function checkSetup() {
      try {
        const result = await window.api.auth.isSetupComplete();
        setSetupComplete(result.complete);
      } catch {
        setSetupComplete(true);
      } finally {
        setIsChecking(false);
      }
    }
    checkSetup();
  }, []);

  // Session timeout check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated && checkSessionTimeout()) {
        logout();
        window.api.auth.logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, checkSessionTimeout, logout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (isChecking) return <LoadingScreen />;
  if (!setupComplete) return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<SetupPage onComplete={() => setSetupComplete(true)} />} />
      </Routes>
    </HashRouter>
  );

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: theme === 'light' ? {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '14px',
          } : {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 5000 },
        }}
      />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/opd" element={<OpdPage />} />
          <Route path="/ipd" element={<IpdPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute adminOnly><AuditLogsPage /></PrivateRoute>} />
          <Route path="/backup" element={<PrivateRoute adminOnly><BackupPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute adminOnly><SettingsPage /></PrivateRoute>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
