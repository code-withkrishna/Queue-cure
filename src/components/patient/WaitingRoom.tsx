'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPublicClinicId } from '@/lib/clinic-id';
import { debounce } from '@/lib/debounce';
import { Patient } from '@/types';

interface Props {
  accessCode: string;
}

interface WaitRoomData {
  found: boolean;
  patient?: Patient;
  peopleAhead: number;
  estimatedWait: number;
  isPaused: boolean;
  currentTokenNumber: string | null;
  avgConsultationMinutes: number;
}

export default function WaitingRoom({ accessCode }: Props) {
  const [data, setData]               = useState<WaitRoomData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [connectionState, setConnectionState] =
    useState<'connected' | 'connecting' | 'error'>('connecting');

  const supabaseRef = useRef(createClient());
  const clinicId    = getPublicClinicId();

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/wait-room/${encodeURIComponent(accessCode)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;

      const payload = await res.json();
      setData(payload);
      setNotFound(false);
    } catch (err) {
      console.error('[WaitingRoom fetchAll]', err);
    } finally {
      setLoading(false);
    }
  }, [accessCode]);

  const debouncedFetch = useRef(debounce(() => { void fetchAll(); }, 300)).current;

  useEffect(() => {
    void fetchAll();

    if (!clinicId) return;

    const supabase = supabaseRef.current;
    const filter   = `clinic_id=eq.${clinicId}`;

    const channel = supabase
      .channel('waiting-room-' + accessCode)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_settings', filter },
        debouncedFetch
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED')                              setConnectionState('connected');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionState('error');
        if (status === 'CLOSED')                                  setConnectionState('connecting');
      });

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll, debouncedFetch, accessCode, clinicId]);

  const patient       = data?.patient ?? null;
  const peopleAhead   = data?.peopleAhead ?? -1;
  const estimatedWait = data?.estimatedWait ?? 0;

  const isCalled    = patient?.status === 'CALLED';
  const isCompleted = patient?.status === 'COMPLETED';
  const isCancelled = patient?.status === 'CANCELLED';
  const isWaiting   = patient?.status === 'WAITING';
  const isPaused    = data?.isPaused ?? false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E3A5F]
                      flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E3A5F]
                      flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-white text-2xl font-bold mb-2">Token Not Found</h1>
          <p className="text-blue-200">This QR code is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700
      ${isCalled    ? 'bg-gradient-to-br from-emerald-900 to-emerald-700'
      : isCompleted ? 'bg-gradient-to-br from-slate-800 to-slate-600'
      :               'bg-gradient-to-br from-[#0F172A] to-[#1E3A5F]'}`}
    >
      <header className="px-6 pt-8 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white text-xs font-black">Q</span>
          </div>
          <span className="text-white/80 text-sm font-semibold">Queue Cure</span>
        </div>
        <div className="flex items-center gap-1.5">
          {connectionState === 'connected'  && <><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-white/60 text-xs">Live</span></>}
          {connectionState === 'connecting' && <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /><span className="text-amber-400/80 text-xs">Reconnecting...</span></>}
          {connectionState === 'error'      && <><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-red-400/80 text-xs">Connection lost</span></>}
        </div>
      </header>

      {isPaused && (
        <div className="mx-6 mt-4 bg-amber-500/20 border border-amber-400/30 rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-300 font-semibold text-sm">⏸ Queue temporarily paused</p>
          <p className="text-amber-400/80 text-xs mt-0.5">Doctor temporarily unavailable</p>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">

        {isCalled && (
          <div className="text-center animate-bounce-slow">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-white font-black text-2xl tracking-wide">Your Turn!</p>
            <p className="text-emerald-200 text-sm mt-1">Please proceed to the doctor</p>
          </div>
        )}

        <div className={`w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden
          ${isCalled ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-emerald-800' : ''}`}>
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 px-6 pt-6 pb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
              Your Token
            </p>
            <p className="text-center font-black text-7xl tracking-[0.3em] text-slate-900
                          font-mono mt-2 leading-none">
              {patient?.token_number}
            </p>
          </div>
          <div className="px-6 py-3 border-t border-slate-100">
            <p className="text-center text-sm font-semibold text-slate-600">{patient?.patient_name}</p>
          </div>
        </div>

        {patient?.chief_complaint && patient?.ai_priority && (
          <div className={`w-full max-w-xs rounded-2xl px-4 py-3 border text-center text-sm ${
            patient.ai_priority === 'EMERGENCY' ? 'bg-red-500/20 border-red-400/30 text-red-200'
            : patient.ai_priority === 'URGENT'  ? 'bg-amber-500/20 border-amber-400/30 text-amber-200'
            :                                      'bg-white/10 border-white/10 text-white/60'
          }`}>
            <span className="font-semibold">
              {patient.ai_priority === 'EMERGENCY' ? '🚨 Priority: Emergency'
               : patient.ai_priority === 'URGENT'  ? '⚠️ Priority: Urgent'
               :                                      '✓ Priority: Routine'}
            </span>
            {patient.ai_priority_note && (
              <p className="text-xs mt-0.5 opacity-70">{patient.ai_priority_note}</p>
            )}
          </div>
        )}

        {!isCompleted && !isCancelled && (
          <div className="w-full max-w-xs space-y-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4
                            flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <p className="text-white/70 text-sm font-medium">Now Calling</p>
              </div>
              <p className="text-white font-black text-xl font-mono tracking-wider">
                {data?.currentTokenNumber ?? '—'}
              </p>
            </div>

            {isWaiting && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4
                              flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👥</span>
                  <p className="text-white/70 text-sm font-medium">Ahead of You</p>
                </div>
                <p className="text-white font-black text-xl">
                  {peopleAhead <= 0
                    ? <span className="text-emerald-400">{"You're next!"}</span>
                    : `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'}`}
                </p>
              </div>
            )}

            {isWaiting && peopleAhead > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4
                              flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱</span>
                  <p className="text-white/70 text-sm font-medium">Est. Wait</p>
                </div>
                <p className="text-white font-black text-xl">~{estimatedWait} min</p>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4
                            flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">{isCalled ? '✅' : '⌛'}</span>
                <p className="text-white/70 text-sm font-medium">Status</p>
              </div>
              <span className={`font-black text-sm px-3 py-1 rounded-full ${
                isCalled ? 'bg-emerald-400 text-emerald-900' : 'bg-blue-400/30 text-blue-200'
              }`}>
                {patient?.status}
              </span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="text-center bg-white/10 rounded-3xl px-8 py-8 max-w-xs w-full">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-white font-black text-2xl">Consultation Done</h2>
            <p className="text-white/60 text-sm mt-2">Thank you for visiting. Get well soon!</p>
          </div>
        )}

        {isCancelled && (
          <div className="text-center bg-white/10 rounded-3xl px-8 py-8 max-w-xs w-full">
            <p className="text-5xl mb-4">❌</p>
            <h2 className="text-white font-black text-2xl">Token Cancelled</h2>
            <p className="text-white/60 text-sm mt-2">Please visit the reception for assistance.</p>
          </div>
        )}
      </main>

      <footer className="px-6 pb-8 text-center space-y-2">
        {connectionState === 'connected'  && <p className="text-white/30 text-xs">This page updates automatically — no refresh needed</p>}
        {connectionState === 'connecting' && <div className="flex items-center justify-center gap-2 text-amber-400/80 text-xs"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Reconnecting...</div>}
        {connectionState === 'error'      && <div className="flex items-center justify-center gap-2 text-red-400/80 text-xs"><span className="w-2 h-2 rounded-full bg-red-400" />Connection lost — pull to refresh</div>}
      </footer>
    </div>
  );
}
