import { useEffect, useState } from 'react';
import { Users, Activity, Bed, FileText, TrendingUp, IndianRupee, Clock, UserCheck, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency, paiseToRupees } from '../../utils/currency';
import { useAuthStore } from '../../store/auth.store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { today, startOfMonth, daysAgo } from '../../utils/dateUtils';

interface DashboardStats {
  totalPatients: number;
  todayOPD: number;
  todayIPD: number;
  todayBills: number;
  todayCollection: number;
  pendingPayments: number;
  admittedPatients: number;
  totalRevenue: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { settings, user } = useAuthStore();
  const sym = settings?.currency_symbol || '₹';
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0, todayOPD: 0, todayIPD: 0, todayBills: 0,
    todayCollection: 0, pendingPayments: 0, admittedPatients: 0, totalRevenue: 0,
  });
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; amount: number }>>([]);
  const [paymentModes, setPaymentModes] = useState<Array<{ payment_mode: string; amount: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [patients, opdCount, ipdCount, billCount, collection, pending, admitted, revenue, daily, modes] = await Promise.all([
        window.api.patients.getCount(),
        window.api.opd.getTodayCount(),
        window.api.ipd.getTodayCount(),
        window.api.billing.getTodayBillCount(),
        window.api.billing.getTodayCollection(),
        window.api.billing.getPendingPayments(),
        window.api.ipd.getAdmittedCount(),
        window.api.billing.getTotalRevenue(),
        window.api.billing.getDailyRevenue(30),
        window.api.billing.getPaymentModeBreakdown(),
      ]);

      setStats({
        totalPatients: patients.count,
        todayOPD: opdCount.count,
        todayIPD: ipdCount.count,
        todayBills: billCount.count,
        todayCollection: collection.amount,
        pendingPayments: pending.amount,
        admittedPatients: admitted.count,
        totalRevenue: revenue.amount,
      });

      setDailyRevenue((daily.data || []).map(d => ({ ...d, amount: paiseToRupees(d.amount) })));
      setPaymentModes(modes.data || []);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const quickActions = [
    { label: 'Create New Bill', icon: FileText, color: 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30', path: '/billing' },
    { label: 'Add Patient', icon: Users, color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30', path: '/patients' },
    { label: 'OPD Visit', icon: Activity, color: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-600/30', path: '/opd' },
    { label: 'IPD Admission', icon: Bed, color: 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-600/30', path: '/ipd' },
    { label: 'Record Payment', icon: IndianRupee, color: 'bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30', path: '/payments' },
    { label: 'View Reports', icon: TrendingUp, color: 'bg-pink-600/20 text-pink-400 border-pink-500/30 hover:bg-pink-600/30', path: '/reports' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.full_name}</strong> · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={loadDashboard} className="btn-secondary btn-sm">
          Refresh
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map(action => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${action.color}`}
          >
            <action.icon size={20} />
            <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value={stats.totalPatients.toLocaleString()}
          icon={<Users size={22} className="text-blue-400" />}
          iconBg="bg-blue-600/20"
          loading={loading}
        />
        <StatCard
          label="Today's Collection"
          value={formatCurrency(stats.todayCollection, sym)}
          icon={<IndianRupee size={22} className="text-emerald-400" />}
          iconBg="bg-emerald-600/20"
          loading={loading}
        />
        <StatCard
          label="Admitted Patients"
          value={stats.admittedPatients.toLocaleString()}
          icon={<Bed size={22} className="text-purple-400" />}
          iconBg="bg-purple-600/20"
          loading={loading}
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrency(stats.pendingPayments, sym)}
          icon={<Clock size={22} className="text-amber-400" />}
          iconBg="bg-amber-600/20"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today OPD Visits"
          value={stats.todayOPD.toLocaleString()}
          icon={<Activity size={22} className="text-cyan-400" />}
          iconBg="bg-cyan-600/20"
          loading={loading}
        />
        <StatCard
          label="Today IPD Admissions"
          value={stats.todayIPD.toLocaleString()}
          icon={<UserCheck size={22} className="text-indigo-400" />}
          iconBg="bg-indigo-600/20"
          loading={loading}
        />
        <StatCard
          label="Today Bills Generated"
          value={stats.todayBills.toLocaleString()}
          icon={<FileText size={22} className="text-pink-400" />}
          iconBg="bg-pink-600/20"
          loading={loading}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, sym)}
          icon={<TrendingUp size={22} className="text-orange-400" />}
          iconBg="bg-orange-600/20"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-slate-100">Daily Revenue (Last 30 Days)</h3>
          </div>
          <div className="p-4 h-64">
            {dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                    labelFormatter={l => `Date: ${l}`}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <p>No revenue data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Mode Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-100">Payment Modes</h3>
          </div>
          <div className="p-4 h-64">
            {paymentModes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModes}
                    dataKey="amount"
                    nameKey="payment_mode"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ payment_mode, percent }) => `${payment_mode} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {paymentModes.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    formatter={(v: number) => [formatCurrency(v, sym), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <p>No payment data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
