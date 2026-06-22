'use client';

import { useState, useRef } from 'react';
import { FamilyGroup, Patient } from '@/types';

interface Props {
  familyGroups: FamilyGroup[];
  onPatientAdded: (patient: Patient) => void;
}

export default function AddPatientForm({ familyGroups, onPatientAdded }: Props) {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [complaint, setComplaint] = useState('');
  const [groupId, setGroupId]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      let resolvedGroupId = groupId;

      if (showNewGroup && newGroup.trim()) {
        const groupRes = await fetch('/api/family-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_name: newGroup.trim() }),
        });
        if (groupRes.ok) {
          const { group } = await groupRes.json();
          resolvedGroupId = group.id;
        }
      }

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name:    name.trim(),
          phone:           phone.trim() || undefined,
          family_group_id: resolvedGroupId || undefined,
          chief_complaint: complaint.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add patient');
      }

      const { patient } = await res.json();
      onPatientAdded(patient);

      setName('');
      setPhone('');
      setComplaint('');
      setGroupId('');
      setNewGroup('');
      setShowNewGroup(false);

      setTimeout(() => nameRef.current?.focus(), 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-800">Add Patient</h2>
      </div>

      <div className="space-y-4">
        {/* Patient Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Patient Name <span className="text-red-400">*</span>
          </label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Ramesh Kumar"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                       text-slate-800 placeholder-slate-400 focus:outline-none
                       focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                       transition-all text-sm font-medium"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Phone <span className="text-slate-300 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 98765 43210"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                       text-slate-800 placeholder-slate-400 focus:outline-none
                       focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                       transition-all text-sm font-medium"
          />
        </div>

        {/* Chief Complaint — AI Triage */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Chief Complaint{' '}
            <span className="text-violet-500 font-semibold normal-case">✦ AI triage</span>
          </label>
          <input
            type="text"
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. fever since yesterday, chest pain..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                       text-slate-800 placeholder-slate-400 focus:outline-none
                       focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400
                       transition-all text-sm font-medium"
          />
          <p className="text-xs text-slate-400 mt-1">
            Optional — AI assigns <span className="font-semibold">ROUTINE / URGENT / EMERGENCY</span> automatically
          </p>
        </div>

        {/* Family Group */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Family Group <span className="text-slate-300 font-normal normal-case">(optional)</span>
          </label>
          {!showNewGroup ? (
            <div className="flex gap-2">
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                           text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30
                           focus:border-blue-400 transition-all text-sm font-medium"
              >
                <option value="">No group</option>
                {familyGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.group_name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewGroup(true)}
                className="px-3 py-2.5 rounded-xl border border-dashed border-slate-300
                           text-slate-400 hover:border-blue-400 hover:text-blue-500
                           transition-colors text-xs font-semibold whitespace-nowrap"
              >
                + New
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="e.g. Ramesh Family"
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50
                           text-slate-800 placeholder-slate-400 focus:outline-none
                           focus:ring-2 focus:ring-blue-500/30 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => { setShowNewGroup(false); setNewGroup(''); }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-400
                           hover:text-slate-600 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => handleSubmit()}
          disabled={!name.trim() || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white font-bold py-3 rounded-xl transition-all
                     shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30
                     flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {complaint.trim() ? 'Generating token...' : 'Generating...'}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Generate Token
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          Press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">Enter</kbd> to submit quickly
        </p>
      </div>
    </div>
  );
}
