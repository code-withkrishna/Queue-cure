import { PatientStatus } from '@/types';

const CONFIG: Record<PatientStatus, { label: string; classes: string; dot?: boolean }> = {
  WAITING:   { label: 'Waiting',   classes: 'bg-blue-50   text-blue-700   border-blue-200',   dot: true  },
  CALLED:    { label: 'Called',    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: true  },
  COMPLETED: { label: 'Completed', classes: 'bg-slate-100  text-slate-600   border-slate-200',  dot: false },
  SKIPPED:   { label: 'Skipped',   classes: 'bg-amber-50   text-amber-700   border-amber-200',   dot: false },
  CANCELLED: { label: 'Cancelled', classes: 'bg-red-50     text-red-700     border-red-200',     dot: false },
};

interface Props {
  status: PatientStatus;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold
        ${sizeClasses} ${cfg.classes}`}
    >
      {cfg.dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'CALLED' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
          }`}
        />
      )}
      {cfg.label}
    </span>
  );
}
