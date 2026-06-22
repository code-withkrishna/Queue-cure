'use client';

import { useMemo } from 'react';
import { Patient, PatientAction } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

// ── Waited time (memoized per row) ───────────────────────────
function WaitedCell({ createdAt }: { createdAt: string }) {
  const label = useMemo(
    () => formatDistanceToNow(new Date(createdAt), { addSuffix: true }),
    [createdAt]
  );
  return <span className="text-xs text-slate-400">{label}</span>;
}

// ── Triage Priority Badge ────────────────────────────────────
function TriageBadge({ priority, note }: { priority: string | null; note?: string | null }) {
  if (!priority) return null;

  const styles: Record<string, string> = {
    EMERGENCY: 'bg-red-100 text-red-700 border-red-300',
    URGENT:    'bg-amber-100 text-amber-700 border-amber-300',
    ROUTINE:   'bg-slate-100 text-slate-500 border-slate-200',
  };
  const icons: Record<string, string> = {
    EMERGENCY: '🚨',
    URGENT:    '⚠️',
    ROUTINE:   '✓',
  };

  return (
    <span
      title={note ?? ''}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  text-xs font-bold border cursor-help mt-0.5
                  ${styles[priority] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}
    >
      {icons[priority]} {priority}
    </span>
  );
}

// ── Action Button ────────────────────────────────────────────
function ActionBtn({
  label, onClick, disabled, variant,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const styles = {
    primary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    danger:  'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      {label}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────
interface Props {
  patients: Patient[];
  onAction: (patientId: string, action: PatientAction) => void;
  actionLoading: string | null;
  isLoading: boolean;
}

export default function QueueTable({ patients, onAction, actionLoading, isLoading }: Props) {
  const isActing  = (id: string, action: string) => actionLoading === `${id}-${action}`;
  const anyLoading = !!actionLoading;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-800">Queue</h2>
        {!isLoading && (
          <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {patients.length}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Token', 'Patient', 'Phone', 'Status', 'Waited', 'Actions'].map((h) => (
                <th key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-slate-400
                               uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857
                           M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857
                           m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-slate-500">No patients waiting</p>
                    <p className="text-sm">Add a patient using the form on the left</p>
                  </div>
                </td>
              </tr>
            ) : (
              patients.map((p, idx) => (
                <tr key={p.id}
                    className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50
                      ${p.status === 'CALLED' ? 'bg-emerald-50/40' : ''}
                      ${p.ai_priority === 'EMERGENCY' ? 'bg-red-50/30' : ''}
                      ${p.ai_priority === 'URGENT' && p.status !== 'CALLED' ? 'bg-amber-50/20' : ''}`}
                >
                  {/* Token */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-black text-slate-800 text-base tracking-wider">
                      {p.token_number}
                    </span>
                    {p.family_group && (
                      <p className="text-xs text-slate-400 mt-0.5">{p.family_group.group_name}</p>
                    )}
                  </td>

                  {/* Patient — includes triage badge */}
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800 text-sm">{p.patient_name}</p>
                    <TriageBadge priority={p.ai_priority ?? null} note={p.ai_priority_note} />
                    <p className="text-xs text-slate-400 mt-0.5">#{idx + 1}</p>
                  </td>

                  {/* Phone */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-500">{p.phone || '—'}</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.status} />
                  </td>

                  {/* Waited */}
                  <td className="px-5 py-3.5">
                    <WaitedCell createdAt={p.created_at} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.status === 'WAITING' && (
                        <>
                          <ActionBtn
                            label={isActing(p.id, 'call') ? '...' : 'Call'}
                            onClick={() => onAction(p.id, 'call')}
                            disabled={anyLoading}
                            variant="primary"
                          />
                          <ActionBtn
                            label={isActing(p.id, 'cancel') ? '...' : 'Cancel'}
                            onClick={() => onAction(p.id, 'cancel')}
                            disabled={anyLoading}
                            variant="danger"
                          />
                        </>
                      )}
                      {p.status === 'CALLED' && (
                        <>
                          <ActionBtn
                            label={isActing(p.id, 'complete') ? '...' : 'Complete'}
                            onClick={() => onAction(p.id, 'complete')}
                            disabled={anyLoading}
                            variant="success"
                          />
                          <ActionBtn
                            label={isActing(p.id, 'skip') ? '...' : 'Skip'}
                            onClick={() => onAction(p.id, 'skip')}
                            disabled={anyLoading}
                            variant="warning"
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
