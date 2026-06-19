import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E3A5F]
                    flex flex-col items-center justify-center p-8 text-center">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600
                      flex items-center justify-center mb-6
                      shadow-2xl shadow-blue-600/40">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24"
             stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0
               00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>

      <h1 className="text-5xl font-black text-white mb-3 tracking-tight font-syne">
        Queue Cure
      </h1>
      <p className="text-blue-200 text-lg mb-8 max-w-sm">
        Real-time event-driven queue management for neighborhood clinics.
        Supabase CDC → all screens sync in under 200ms.
      </p>

      {/* Problems */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        {[
          { icon: '❌', text: 'Paper tokens' },
          { icon: '❌', text: 'Crowded waiting rooms' },
          { icon: '❌', text: 'Manual triage guessing' },
        ].map((item) => (
          <span key={item.text}
                className="bg-red-900/30 border border-red-800/50 text-red-300
                           text-sm px-4 py-1.5 rounded-full font-medium">
            {item.icon} {item.text}
          </span>
        ))}
      </div>

      {/* Solutions */}
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        {[
          { icon: '✅', text: 'Live digital tokens via QR' },
          { icon: '✅', text: 'Real-time sync — no refresh' },
          { icon: '✨', text: 'AI triage: ROUTINE / URGENT / EMERGENCY' },
        ].map((item) => (
          <span key={item.text}
                className="bg-emerald-900/20 border border-emerald-700/40 text-emerald-300
                           text-sm px-4 py-1.5 rounded-full font-medium">
            {item.icon} {item.text}
          </span>
        ))}
      </div>

      {/* Architecture highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mb-10">
        {[
          {
            title: 'Supabase CDC',
            desc: 'postgres_changes over WebSocket. No polling. Ever.',
          },
          {
            title: 'Smart Wait Engine',
            desc: 'Wait times from real consultation durations. Never hardcoded.',
          },
          {
            title: 'AI Triage',
            desc: 'Groq LLaMA classifies complaints into priority badges in <1s.',
          },
        ].map((card) => (
          <div key={card.title}
               className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-left">
            <p className="text-white font-bold text-sm mb-1">{card.title}</p>
            <p className="text-blue-200/70 text-xs leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      <Link
        href="/reception"
        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold
                   rounded-2xl transition-all shadow-lg shadow-blue-600/30
                   hover:shadow-blue-500/40 text-lg"
      >
        🏥 Open Reception Dashboard
      </Link>

      <p className="text-white/30 text-xs mt-10">
        Queue Cure Hackathon · Next.js 14 · Supabase Realtime · Groq LLaMA
      </p>
    </div>
  );
}
