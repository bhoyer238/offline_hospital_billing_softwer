import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  loading?: boolean;
}

export default function StatCard({ label, value, icon, iconBg = 'bg-blue-600/20', trend, loading }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={clsx('stat-icon', iconBg)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400 mb-0.5">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-slate-700 rounded animate-pulse" />
        ) : (
          <p className="text-xl font-bold text-slate-100 truncate">{value}</p>
        )}
        {trend && (
          <p className={clsx('text-xs mt-0.5', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
