import { QueueStats } from '@/types';

interface Props {
  stats: QueueStats | null;
  isLoading: boolean;
}

function Card({
  label,
  value,
  sub,
  accent,
  isLoading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      {isLoading ? (
        <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse mt-1" />
      ) : (
        <p className={`text-4xl font-black tracking-tight ${accent}`}>{value}</p>
      )}
      {sub && !isLoading && (
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      )}
    </div>
  );
}

export default function MetricsBar({ stats, isLoading }: Props) {
  const isPaused = stats?.isPaused ?? false;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Waiting"
        value={stats?.waitingCount ?? 0}
        sub="patients in queue"
        accent="text-blue-600"
        isLoading={isLoading}
      />
      <Card
        label="Current Token"
        value={stats?.currentToken?.token_number ?? '—'}
        sub={stats?.currentToken?.patient_name ?? 'No active token'}
        accent="text-emerald-600"
        isLoading={isLoading}
      />
      <Card
        label="Avg. Consultation"
        value={`${stats?.avgConsultationMinutes ?? 8} min`}
        sub={`Longest: ${stats?.longestConsultationMinutes ?? 0} min`}
        accent="text-violet-600"
        isLoading={isLoading}
      />
      <Card
        label="Served Today"
        value={stats?.patientsServedToday ?? 0}
        sub={isPaused ? '⏸ Queue paused' : '✓ Queue running'}
        accent={isPaused ? 'text-amber-600' : 'text-slate-800'}
        isLoading={isLoading}
      />
    </div>
  );
}
