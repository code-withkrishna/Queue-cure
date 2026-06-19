'use client';

import { useEffect, useState } from 'react';
import { Patient, TriagePriority } from '@/types';

interface Props {
  patient: Patient;
  onClose: () => void;
}

const PRIORITY_BADGE: Record<TriagePriority, { icon: string; classes: string }> = {
  EMERGENCY: {
    icon: '🚨',
    classes: 'bg-red-500/30 border-red-400/50 text-red-200',
  },
  URGENT: {
    icon: '⚠️',
    classes: 'bg-amber-500/30 border-amber-400/50 text-amber-200',
  },
  ROUTINE: {
    icon: '✓',
    classes: 'bg-white/20 border-white/20 text-blue-200',
  },
};

export default function QRModal({ patient, onClose }: Props) {
  const [qrUrl, setQrUrl]   = useState<string>('');
  const [copied, setCopied] = useState(false);

  const waitUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/wait/${patient.qr_access_code}`
      : `/wait/${patient.qr_access_code}`;

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(waitUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#1E3A5F', light: '#FFFFFF' },
      }).then(setQrUrl);
    });
  }, [waitUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(waitUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const priorityConfig = patient.ai_priority
    ? PRIORITY_BADGE[patient.ai_priority]
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-blue-200 text-sm font-medium uppercase tracking-widest">
                Token Generated
              </p>
              <h2 className="text-5xl font-black tracking-widest mt-1 font-mono">
                {patient.token_number}
              </h2>
              <p className="text-blue-100 mt-2 font-medium">{patient.patient_name}</p>
              {patient.phone && (
                <p className="text-blue-200 text-sm mt-0.5">{patient.phone}</p>
              )}

              {/* AI Priority badge — visible immediately after registration */}
              {priorityConfig && patient.ai_priority && (
                <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1
                                 rounded-full text-xs font-bold border
                                 ${priorityConfig.classes}`}>
                  {priorityConfig.icon} {patient.ai_priority}
                  {patient.ai_priority_note && (
                    <span className="font-normal opacity-80">
                      — {patient.ai_priority_note}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center
                         hover:bg-white/30 transition-colors text-white text-lg ml-3 shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* QR Section */}
        <div className="px-6 py-5 flex flex-col items-center gap-4">
          {qrUrl ? (
            <div className="p-3 border-2 border-slate-100 rounded-2xl">
              <img src={qrUrl} alt="QR Code" width={180} height={180} />
            </div>
          ) : (
            <div className="w-[180px] h-[180px] bg-slate-100 rounded-2xl animate-pulse" />
          )}

          <p className="text-slate-500 text-sm text-center">
            Patient scans this to track their position in real time
          </p>

          {/* Copy URL */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between bg-slate-50 border
                       border-slate-200 rounded-xl px-4 py-2.5 text-sm
                       hover:bg-slate-100 transition-colors"
          >
            <span className="truncate text-slate-500 font-mono text-xs">{waitUrl}</span>
            <span className="ml-2 text-blue-600 font-semibold shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold
                       py-3 rounded-xl transition-colors"
          >
            Done — Next Patient
          </button>
        </div>
      </div>
    </div>
  );
}
