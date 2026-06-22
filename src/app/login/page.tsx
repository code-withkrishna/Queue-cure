'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const supabaseRef = useRef(createClient());

  // Surface a failed code-exchange redirect from /auth/callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'auth_failed') {
      setError('That login link expired or was already used. Please request a new one.');
    }
    if (params.get('error') === 'forbidden') {
      setError('This email is not authorized for staff access. Contact your clinic admin.');
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const { error: authErr } = await supabaseRef.current.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // PKCE flow: the magic link must land on /auth/callback first
        // so the `code` param can be exchanged for a real session,
        // THEN it forwards on to /reception. Pointing this straight
        // at /reception is what was breaking login.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/reception`,
      },
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E3A5F]
                    flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">

        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700
                        flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0
                 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-1 font-syne">
          Reception Login
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Staff access only. Enter your email to receive a one-click login link.
        </p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-3">📬</p>
            <p className="font-bold text-emerald-800 text-lg">Check your inbox</p>
            <p className="text-sm text-emerald-600 mt-2">
              A login link was sent to{' '}
              <span className="font-semibold">{email}</span>
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="mt-4 text-xs text-emerald-600 underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="receptionist@clinic.com"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50
                           text-slate-800 placeholder-slate-400 focus:outline-none
                           focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                           transition-all text-sm font-medium"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700
                              rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!email.trim() || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-bold py-3
                         rounded-xl transition-all shadow-lg shadow-blue-600/20
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Login Link →'
              )}
            </button>

            <p className="text-center text-xs text-slate-400 pt-1">
              For demo: use any email — the link arrives instantly
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
