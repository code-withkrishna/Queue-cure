import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Always run fresh — never cache a health check.
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Lightweight uptime/monitoring endpoint. No auth required —
 * point Vercel/UptimeRobot/your monitor of choice at this.
 * Confirms the app is running AND that it can actually reach
 * the database (catches "deployed but misconfigured" early).
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('clinics').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          database: 'unreachable',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'reachable',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
