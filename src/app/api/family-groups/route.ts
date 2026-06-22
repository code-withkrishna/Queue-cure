import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { handleRouteError } from '@/lib/api-utils';
import { validateGroupName } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const supabase = createClient();

    const { data: groups, error } = await supabase
      .from('family_groups')
      .select('*')
      .eq('clinic_id', getClinicId())
      .order('group_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ groups: groups ?? [] });
  } catch (err) {
    return handleRouteError(err, '[GET /api/family-groups]');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { group_name } = await req.json();
    const name = validateGroupName(group_name);

    const supabase = createClient();
    const { data: group, error } = await supabase
      .from('family_groups')
      .insert({ group_name: name, clinic_id: getClinicId() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, '[POST /api/family-groups]');
  }
}
