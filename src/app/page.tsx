import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-dm selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation / Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-syne font-bold text-xl tracking-tight text-slate-900">Queue Cure</span>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/reception" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
               Reception Login
             </Link>
             <Link href="/reception" className="text-sm font-medium bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
               Get Started
             </Link>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* SECTION 1 — HERO */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-24 pb-32">
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-blue-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>

          <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Live Digital Waiting Room for Neighborhood Clinics
            </div>

            <h1 className="text-5xl md:text-7xl font-syne font-black text-slate-900 mb-6 tracking-tight leading-[1.1] max-w-4xl mx-auto">
              Patients Stop Guessing.<br className="hidden md:block"/> Clinics Stop Explaining.
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Queue Cure gives every patient a live view of their place in line while helping receptionists manage queues effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/reception" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 text-lg flex items-center justify-center gap-2">
                Open Reception Dashboard
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link href="/wait/demo" className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-all text-lg flex items-center justify-center gap-2">
                See Patient Experience
              </Link>
            </div>

            {/* Hero Visual Mockup */}
            <div className="mt-20 relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10"></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
                 {/* Desktop Dashboard Mockup */}
                 <div className="flex-1 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col h-80">
                    <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                       <div className="flex gap-1.5">
                         <div className="w-3 h-3 rounded-full bg-red-400"></div>
                         <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                         <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                       </div>
                       <div className="mx-auto h-5 w-48 bg-white rounded text-[10px] text-center leading-5 text-slate-400 border border-slate-200">Reception Dashboard</div>
                    </div>
                    <div className="p-6 flex flex-col gap-4 flex-1 bg-slate-50">
                       <div className="h-8 w-1/3 bg-slate-200 rounded-md"></div>
                       <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
                         <div className="h-12 bg-slate-50 border border-slate-100 rounded flex items-center px-4 gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0"></div>
                            <div className="h-4 w-24 bg-slate-200 rounded"></div>
                            <div className="ml-auto h-6 w-16 bg-blue-500 rounded-full"></div>
                         </div>
                         <div className="h-12 bg-slate-50 border border-slate-100 rounded flex items-center px-4 gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0"></div>
                            <div className="h-4 w-32 bg-slate-200 rounded"></div>
                            <div className="ml-auto h-6 w-16 bg-slate-200 rounded-full"></div>
                         </div>
                       </div>
                    </div>
                 </div>
                 {/* Mobile Mockup */}
                 <div className="hidden md:flex w-64 rounded-[2rem] border-8 border-slate-800 bg-white shadow-xl relative z-20 flex-col overflow-hidden h-96 -mt-8 mb-8 rotate-[-5deg]">
                    <div className="h-6 bg-slate-800 w-full flex justify-center rounded-b-xl mb-4 relative z-10"><div className="w-16 h-4 bg-black rounded-b-xl"></div></div>
                    <div className="px-4 flex flex-col items-center flex-1">
                      <div className="w-12 h-12 rounded-full bg-blue-100 mb-3 flex items-center justify-center">
                         <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Your Turn In</div>
                      <div className="text-4xl font-syne font-black text-slate-900 mb-6">15 min</div>
                      <div className="w-full bg-slate-100 rounded-xl p-4 flex flex-col gap-3">
                         <div className="text-sm font-semibold text-slate-700 text-center">Currently Serving</div>
                         <div className="text-2xl font-bold text-center text-blue-600">Token #42</div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — PROBLEM */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-syne font-bold text-slate-900 mb-4">The Waiting Room Problem</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Traditional queue management creates friction for everyone involved.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Paper Token Chaos',
                  desc: 'Physical tokens get lost, torn, or ignored. Patients must remain physically present in crowded spaces.',
                  icon: (
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )
                },
                {
                  title: 'Repeated Queue Questions',
                  desc: 'Receptionists are constantly interrupted by patients asking "How much longer?" instead of focusing on care.',
                  icon: (
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  )
                },
                {
                  title: 'No Visibility Into Waiting Time',
                  desc: 'Patients wait anxiously without realistic estimates, leading to frustration and lower satisfaction scores.',
                  icon: (
                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )
                }
              ].map((card, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — SOLUTION (TIMELINE) */}
        <section className="py-24 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-syne font-bold text-slate-900 mb-4">How Queue Cure Works</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">A seamless experience from check-in to consultation.</p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-blue-100 -translate-y-1/2 z-0"></div>

              <div className="grid md:grid-cols-4 gap-8 relative z-10">
                {[
                  { step: '01', title: 'Receptionist adds patient', desc: 'Quick entry via the clinic dashboard.' },
                  { step: '02', title: 'Token generated instantly', desc: 'A unique digital ID is assigned.' },
                  { step: '03', title: 'Patient scans QR code', desc: 'No app download required.' },
                  { step: '04', title: 'Everyone sees live queue updates', desc: 'Real-time sync keeps everyone informed.' }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="w-14 h-14 rounded-full bg-white border-4 border-blue-50 text-blue-600 font-bold flex items-center justify-center text-lg mb-6 shadow-sm group-hover:border-blue-100 group-hover:scale-110 transition-all z-10">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — KEY FEATURES */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-syne font-bold text-slate-900 mb-4">Designed for Modern Clinics</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Everything you need to manage your waiting room efficiently.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Digital Tokens', desc: 'Replace paper chits with secure, accessible digital tokens.', icon: '🎟️' },
                { title: 'Real-Time Queue Updates', desc: 'Instant status sync across all devices without refreshing.', icon: '⚡' },
                { title: 'Smart Wait-Time Estimates', desc: 'Dynamic calculations based on actual consultation durations.', icon: '⏱️' },
                { title: 'Family Queue Management', desc: 'Group family members under a single accessible token.', icon: '👨‍👩‍👧‍👦' },
                { title: 'Queue Pause & Resume', desc: 'Flexibility for patients who need to step away briefly.', icon: '⏸️' },
                { title: 'AI-Assisted Patient Priority', desc: 'Optional smart triage to identify urgent cases quickly.', icon: '✨', highlight: true }
              ].map((feat, i) => (
                <div key={i} className={`rounded-2xl p-6 border ${feat.highlight ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-white shadow-sm hover:shadow-md'} transition-shadow`}>
                  <div className="text-3xl mb-4">{feat.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-slate-600">{feat.desc}</p>
                  {feat.highlight && (
                    <div className="mt-4 inline-flex items-center text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-1 rounded">
                      Bonus Feature
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — WHY CLINICS LOVE IT */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-syne font-bold mb-4">Why Clinics Love It</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">Measurable improvements in daily operations.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-800">
              {[
                { metric: '<10s', label: 'Add Patient' },
                { metric: '0', label: 'Manual Refreshes' },
                { metric: '100%', label: 'Real-Time Sync' },
                { metric: 'Mobile', label: 'Friendly Design' }
              ].map((stat, i) => (
                <div key={i} className="text-center px-4">
                  <div className="text-4xl md:text-5xl font-syne font-black text-blue-400 mb-2">{stat.metric}</div>
                  <div className="text-sm md:text-base font-medium text-slate-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6 — FINAL CTA */}
        <section className="py-24 bg-blue-600 text-white text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-syne font-black mb-6">Ready to Modernize Your Clinic Waiting Room?</h2>
            <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto">Join the future of healthcare administration today. No complex setup required.</p>
            <Link href="/reception" className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 hover:bg-slate-50 font-bold rounded-xl transition-colors shadow-xl text-lg">
              Launch Queue Cure
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-syne font-bold text-slate-800">Queue Cure</span>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Queue Cure. Built for modern clinics.</p>
        </div>
      </footer>
    </div>
  );
}
