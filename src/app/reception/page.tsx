'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseBrowserClient } from '@/lib/supabase/use-browser-client';
import { getPublicClinicId } from '@/lib/clinic-id';
import { debounce } from '@/lib/debounce';
import { Patient, QueueStats, FamilyGroup } from '@/types';
import MetricsBar from '@/components/reception/MetricsBar';
import AddPatientForm from '@/components/reception/AddPatientForm';
import QueueTable from '@/components/reception/QueueTable';
import QRModal from '@/components/shared/QRModal';

export default function ReceptionPage() {
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [stats, setStats]               = useState<QueueStats | null>(null);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastAdded, setLastAdded]       = useState<Patient | null>(null);
  const [showQR, setShowQR]             = useState(false);
  const [callError, setCallError]       = useState('');

  const supabase = useSupabaseBrowserClient();
  const clinicId    = getPublicClinicId();

  const fetchQueueData = useCallback(async () => {
    try {
      const res = await fetch('/api/reception/snapshot');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setPatients(data.patients ?? []);
      setStats(data.stats ?? null);
    } catch (err) {
      console.error('[ReceptionPage] fetchQueueData:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFamilyGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/family-groups');
      if (!res.ok) return;
      const data = await res.json();
      setFamilyGroups(data.groups ?? []);
    } catch (err) {
      console.error('[ReceptionPage] fetchFamilyGroups:', err);
    }
  }, []);

  const debouncedFetchQueue = useRef(debounce(() => { void fetchQueueData(); }, 300)).current;

  useEffect(() => {
    void fetchQueueData();
    void fetchFamilyGroups();

    if (!clinicId) return;

    const filter   = `clinic_id=eq.${clinicId}`;

    const channel = supabase
      .channel('reception-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter },
        debouncedFetchQueue
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_settings', filter },
        debouncedFetchQueue
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, debouncedFetchQueue, fetchQueueData, fetchFamilyGroups, supabase]);

  const handleAction = async (patientId: string, action: string) => {
    if (actionLoading) return;
    setActionLoading(`${patientId}-${action}`);
    setCallError('');
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        setCallError(error || 'Action failed');
        setTimeout(() => setCallError(''), 4000);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCallNext = async () => {
    if (actionLoading) return;
    setActionLoading('call-next');
    setCallError('');
    try {
      const res = await fetch('/api/queue/call-next', { method: 'POST' });
      if (!res.ok) {
        const { error } = await res.json();
        setCallError(error || 'Failed to call next');
        setTimeout(() => setCallError(''), 4000);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePause = async () => {
    if (actionLoading) return;
    setActionLoading('toggle-pause');
    try {
      await fetch('/api/queue/toggle-pause', { method: 'POST' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handlePatientAdded = (patient: Patient) => {
    setLastAdded(patient);
    setShowQR(true);
    void fetchFamilyGroups();
    void fetchQueueData();
  };

  const isPaused     = stats?.isPaused ?? false;
  const waitingCount = stats?.waitingCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-100">

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5
                        flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700
                            flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                     M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-lg tracking-tight
                             leading-none font-syne">
                Queue Cure
              </h1>
              <p className="text-xs text-slate-400 font-medium">Reception Dashboard</p>
            </div>
          </div>

          {callError && (
            <div className="flex-1 bg-red-50 border border-red-200 text-red-700
                            rounded-xl px-4 py-2 text-sm font-medium text-center">
              ⚠ {callError}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5
                              rounded-full text-xs font-semibold border ${
              isPaused
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
              }`} />
              {isPaused ? 'Paused' : 'Running'}
            </span>

            <button
              onClick={handleTogglePause}
              disabled={actionLoading === 'toggle-pause'}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                          disabled:opacity-50 ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
              }`}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>

            <button
              onClick={handleCallNext}
              disabled={!!actionLoading || isPaused || waitingCount === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                         text-sm font-bold transition-all shadow-lg shadow-blue-600/25
                         disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              {actionLoading === 'call-next' ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin" />
              ) : '📢'}
              Call Next
            </button>

            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400
                         hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {isPaused && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4
                          flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-800">Queue is Paused</p>
              <p className="text-sm text-amber-600">
                Doctor temporarily unavailable. All patient screens show the paused banner.
              </p>
            </div>
          </div>
        )}

        <MetricsBar stats={stats} isLoading={isLoading} />

        <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-5">
          <AddPatientForm
            familyGroups={familyGroups}
            onPatientAdded={handlePatientAdded}
          />
          <QueueTable
            patients={patients}
            onAction={handleAction}
            actionLoading={actionLoading}
            isLoading={isLoading}
          />
        </div>
      </main>

      {showQR && lastAdded && (
        <QRModal
          patient={lastAdded}
          onClose={() => { setShowQR(false); setLastAdded(null); }}
        />
      )}
    </div>
  );
}
