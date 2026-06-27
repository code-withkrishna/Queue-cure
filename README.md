# Queue Cure 🏥

> **Real-time event-driven queue system for neighborhood clinics.**  
> Supabase CDC WebSocket → simultaneous sync across all screens in <200ms.  
> No polling. No page refresh. No paper tokens.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://github.com/code-withkrishna/Queue-cure)
<!-- ⚠️ Update the link above to your real Vercel URL after deploying (Setup step 8). -->
[![Supabase](https://img.shields.io/badge/Realtime-Supabase%20CDC-green?logo=supabase)](https://supabase.com)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black?logo=next.js)](https://nextjs.org)
[![AI Triage](https://img.shields.io/badge/AI-Groq%20LLaMA-orange)](https://groq.com)

---

## How It Works — In One Sentence

A receptionist adds a patient; a QR code is generated; the patient scans it on
any phone; from that moment, every status change — call, skip, pause, complete —
propagates to their screen via Supabase Realtime CDC with no refresh required.

## Architecture Highlights

- **Supabase Realtime CDC** — `postgres_changes` events over WebSocket push every
  state change to all connected clients simultaneously; zero polling
- **Smart Wait-Time Engine** — estimated wait computed from rolling average of
  actual consultation durations; never a hardcoded number  
- **AI Triage via Groq LLaMA** — chief complaint text classified into
  `ROUTINE | URGENT | EMERGENCY` server-side; priority badge appears on the
  queue table and patient screen in real time
- **State Machine with Audit Trail** — `WAITING → CALLED → COMPLETED / SKIPPED`,
  with skip-requeue logic and a `queue_events` table logging every transition
- **Race Condition Guards** — 409 prevents double-call; `actionLoading` gate
  prevents duplicate requests at the UI layer
- **Multi-Clinic Schema** — `clinic_id` scoping on all tables; designed for
  multi-tenant deployment from day one
- **Self-Managing Infrastructure** — Supabase Edge Function resets queue state
  nightly via cron; no manual intervention needed

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     QUEUE CURE SYSTEM                           │
│                                                                 │
│  Receptionist Browser            Patient Phone                  │
│  ┌───────────────────┐           ┌───────────────────┐         │
│  │ /login            │           │ /wait/{code}      │         │
│  │ /reception        │           │                   │         │
│  │                   │           │ Token Hero        │         │
│  │ AddPatient Form   │           │ Position Card     │         │
│  │  + AI Triage ✦   │           │ Wait Estimate     │         │
│  │ QueueTable        │           │ Priority Badge    │         │
│  │  + Priority Badge │           │ Connection Status │         │
│  │ MetricsBar        │           └────────┬──────────┘         │
│  └────────┬──────────┘                    │ fetch              │
│           │ fetch + PATCH                 │                    │
│           ▼                               ▼                    │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                Next.js 16 API Routes                 │      │
│  │                                                      │      │
│  │  POST /api/patients     → AI Triage → Insert         │      │
│  │  PATCH /api/patients/[id]  (state machine)           │      │
│  │  POST /api/queue/call-next (FIFO + race guard)       │      │
│  │  POST /api/queue/toggle-pause                        │      │
│  │  GET  /api/stats           (live metrics)            │      │
│  └──────────┬────────────────────────┬──────────────────┘      │
│             │ classify complaint      │ read/write              │
│             ▼                        ▼                         │
│  ┌──────────────────┐  ┌────────────────────────────────────┐  │
│  │  Groq LLaMA    │  │   Supabase (PostgreSQL)            │  │
│  │  Triage API      │  │                                    │  │
│  │  <1s latency     │  │  clinics · patients                │  │
│  └──────────────────┘  │  clinic_settings · queue_events    │  │
│                        │  family_groups                     │  │
│                        └──────────────┬─────────────────────┘  │
│                                       │ Realtime CDC           │
│                                       │ (postgres_changes)     │
│                           ┌───────────┴───────────┐           │
│                           │  Supabase Realtime     │           │
│                           │  (WebSocket channels)  │           │
│                           └──────┬──────────┬──────┘           │
│                    push ─────────┘          └──────── push     │
│               Receptionist                      Patient        │
│               re-fetches                        re-fetches     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Supabase Edge Function (daily-reset)               │      │
│  │  Cron: 0 0 * * * — clears token + unpauses queue    │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

| Reception Dashboard | Patient Waiting Room |
|---|---|
| Magic-link auth (staff only) | Open via QR — no app, no login |
| Add patient in < 10 seconds | Live queue position |
| AI triage — ROUTINE/URGENT/EMERGENCY | Estimated wait (real data) |
| Auto-generates A001 tokens | Animated CALLED notification |
| Call Next (FIFO) | AI priority badge on screen |
| Complete / Skip / Cancel | Connection status indicator |
| Family group support | Queue paused banner |
| Live metrics (avg consultation) | Works on any mobile browser |

---

## Smart Wait-Time Engine

```
Average Consultation = Σ(completed_at − called_at) / count(COMPLETED)
                       Fallback: 8 min (until first consultation completes)

Estimated Wait = People Ahead × Average Consultation Time
```

---

## AI Triage Flow

```
Receptionist types: "chest pain since this morning"
        │
        ▼
POST /api/patients
        │
        ├── Token generated
        ├── QR code generated
        └── classifyTriage("chest pain since this morning")
                │
                ▼
          Groq LLaMA
          {"priority":"EMERGENCY","note":"Chest pain requires immediate evaluation"}
                │
                ▼
        patient.ai_priority = "EMERGENCY"
        patient.ai_priority_note = "..."
                │
                ├── 🚨 EMERGENCY badge on queue table row (red)
                ├── 🚨 EMERGENCY badge in QR modal
                └── 🚨 EMERGENCY badge on patient waiting screen
```

---

## Patient State Machine

```
WAITING ──► CALLED ──► COMPLETED
               │
               └──► SKIPPED ──► WAITING (re-queued at end, created_at = now())

WAITING ──► CANCELLED
```

---

## Edge Cases

| Edge Case | Resolution |
|---|---|
| Double-click "Call" | `actionLoading` gate blocks duplicate requests |
| Two receptionists, same patient | API checks for existing CALLED → 409 conflict |
| Patient refreshes page | State from Supabase; realtime re-syncs instantly |
| Empty queue | Empty state UI with instructions |
| Doctor break | Pause Queue → all patient screens show banner |
| Patient no-show | Skip → re-queued at end of FIFO |
| No completions yet | Falls back to 8 min default for wait estimate |
| AI triage API failure | Fail-safe default: ROUTINE — never blocks registration |
| WebSocket disconnects | Patient screen shows "Reconnecting..." indicator |

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/code-withkrishna/Queue-cure.git
cd Queue-cure
npm install
```

### 2. Supabase Setup

Run these **in order** in the Supabase SQL Editor — all six are required, the app will not function correctly if any are skipped:

1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → run `supabase/schema.sql`
3. SQL Editor → run `supabase/migrations/001_ai_triage_multiclinic.sql`
4. SQL Editor → run `supabase/migrations/002_rls_hardening.sql`
5. SQL Editor → run `supabase/migrations/003_multiclinic_settings.sql`
6. SQL Editor → run `supabase/migrations/004_security_and_integrity.sql`
7. SQL Editor → run `supabase/migrations/005_performance.sql`
   **Required, not optional.** This migration defines `create_patient_record`,
   `handle_patient_action`, and `get_reception_snapshot` with the exact
   signatures the API routes call. Skipping it breaks Add Patient, Complete/
   Skip/Cancel, and the entire Reception Dashboard with a
   "function not found" error.
8. **Important:** sync deployment config with your clinic UUID:
   ```sql
   UPDATE deployment_config
   SET clinic_id = (SELECT id FROM clinics WHERE slug = 'default')
   WHERE id = 1;
   ```
9. Copy the `clinic_id` UUID from migration 001 output

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in **all five** of the following — these are the exact variable names
`.env.example` expects (don't shorten them, the app reads these literal names):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → service_role key — **server-only, never expose to the browser.** API routes use this to mutate data; the app will not work without it. |
| `NEXT_PUBLIC_CLINIC_ID` | The UUID you copied in step 2.9 above |
| `GROQ_API_KEY` | Free at [console.groq.com/keys](https://console.groq.com/keys) |

If any of these is missing, the app now fails fast with a clear error naming
the missing variable, instead of silently connecting to a placeholder and
failing later with a confusing network error.

**Strongly recommended for any real deployment** — without these, *any*
email address that completes magic-link sign-in gets full staff access
(add/complete/cancel patients, see names/phone numbers/chief complaints):

```bash
# Uncomment and set at least one of these in .env.local:
STAFF_ALLOWED_EMAILS=reception@yourclinic.com,admin@yourclinic.com
# or
STAFF_EMAIL_DOMAINS=yourclinic.com
```

### 4. Enable Supabase Auth

Dashboard → Authentication → Providers → Email → Enable

### 5. Run

```bash
npm run dev   # http://localhost:3000
npm test      # run the unit test suite (13 tests, ~2s)
```

### 6. Health Check

```
GET /api/health
```
Returns `200 {"status":"ok"}` if the app can reach Supabase — useful for
uptime monitoring (UptimeRobot, Vercel monitoring, etc.) after deploying.

### 7. Deploy Edge Function (Optional)

```bash
supabase functions deploy daily-reset
# Then: Dashboard → Edge Functions → daily-reset → Schedule: 0 0 * * *
```

### 8. Deploy to Vercel

```bash
npx vercel
# Add all 5 env vars from step 3 in the Vercel dashboard
# (plus STAFF_ALLOWED_EMAILS / STAFF_EMAIL_DOMAINS if you set them)
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Landing page
│   ├── login/page.tsx               # Magic-link auth
│   ├── reception/page.tsx           # Reception dashboard
│   ├── wait/[code]/page.tsx         # Patient waiting room
│   └── api/
│       ├── patients/route.ts        # Add patient + AI triage
│       ├── patients/[id]/route.ts   # State machine transitions
│       ├── queue/call-next/         # FIFO call + race guard
│       ├── queue/toggle-pause/      # Pause/resume
│       ├── stats/route.ts           # Live metrics
│       ├── family-groups/           # Group management
│       └── health/route.ts          # Uptime check (GET /api/health)
├── components/
│   ├── reception/
│   │   ├── MetricsBar.tsx           # 4 live stat cards
│   │   ├── AddPatientForm.tsx       # < 10 sec add + AI triage field
│   │   └── QueueTable.tsx           # Queue + priority badges
│   ├── patient/
│   │   └── WaitingRoom.tsx          # Mobile room + reconnection
│   └── shared/
│       ├── StatusBadge.tsx          # Colour-coded status pill
│       └── QRModal.tsx              # Token + QR + priority badge
├── lib/
│   ├── supabase/client.ts           # Browser client
│   ├── supabase/server.ts           # Server client (API routes)
│   ├── token.ts                     # A001 generator (crypto-secure)
│   ├── wait-engine.ts               # Avg + estimated wait
│   └── triage.ts                    # Groq LLaMA classifier
└── types/index.ts                   # All TypeScript types
supabase/
├── schema.sql                       # Base schema
├── migrations/001_ai_triage_multiclinic.sql
├── migrations/002_rls_hardening.sql
├── migrations/003_multiclinic_settings.sql
├── migrations/004_security_and_integrity.sql
├── migrations/005_performance.sql  # Required — RPCs the API routes call
└── functions/daily-reset/index.ts  # Nightly reset
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL + Realtime CDC)
- **AI**: Groq LLaMA (medical triage)
- **Auth**: Supabase Magic Link
- **Styling**: Tailwind CSS + Syne + DM Sans
- **QR Codes**: `qrcode` (client-side)
- **Deployment**: Vercel (app) + Supabase Edge Functions (cron)

---

## Demo Script

1. Open `/` — landing page explains architecture
2. Click "Open Reception Dashboard" → redirected to `/login`
3. Enter email → receive magic link → auto-redirect to `/reception`
4. Add patient: name + "chest pain" complaint → EMERGENCY badge appears in QR modal
5. Open `/wait/{access_code}` on mobile → patient sees EMERGENCY badge
6. Add 2 more patients (routine)
7. Click **Call Next** → patient screen animates instantly (no refresh)
8. Click **Complete** → avg consultation time updates in metrics
9. Pause queue → all patient screens show banner simultaneously
10. Resume → banner disappears on all screens

---

Built with ❤️ for Queue Cure Hackathon
