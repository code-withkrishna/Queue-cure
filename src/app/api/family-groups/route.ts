import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: groups, error } = await supabase
      .from('family_groups')
      .select('*')
      .order('group_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ groups: groups ?? [] });
  } catch (err) {
    console.error('[GET /api/family-groups]', err);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { group_name } = await req.json();
    if (!group_name?.trim()) {
      return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: group, error } = await supabase
      .from('family_groups')
      .insert({ group_name: group_name.trim() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/family-groups]', err);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
