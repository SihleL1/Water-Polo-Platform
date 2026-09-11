import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

async function authorize(request: Request, supabase: ReturnType<typeof createServerSupabase>) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const isDevBypass =
    process.env.NODE_ENV !== 'production' &&
    token === 'dev-token' &&
    process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';

  if (!token && !isDevBypass) {
    return 'Missing authorization';
  }

  if (!isDevBypass) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return 'Invalid token';
    }
  }

  return null;
}

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, city, province')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading teams:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Unexpected error loading teams:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load schools.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: { params: { teamId: string } }) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(req, supabase);
    if (authorizationError) {
      return NextResponse.json({ error: authorizationError }, { status: 401 });
    }

    const body = await req.json();
    if (typeof body.tournament_id !== 'string' || !body.tournament_id.trim()) {
      return NextResponse.json({ error: 'Tournament ID is required.' }, { status: 400 });
    }

    const poolGroupId =
      typeof body.pool_group_id === 'string' && body.pool_group_id.trim()
        ? body.pool_group_id
        : null;
    const { data, error } = await supabase
      .from('tournament_teams')
      .update({ pool_group_id: poolGroupId })
      .eq('team_id', context.params.teamId)
      .eq('tournament_id', body.tournament_id)
      .select()
      .single();

    if (error) {
      console.error('Team pool update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Team pool update API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update team pool.' },
      { status: 500 }
    );
  }
}
