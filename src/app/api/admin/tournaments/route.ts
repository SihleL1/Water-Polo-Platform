import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

async function authorize(request: Request, supabase: ReturnType<typeof createServerSupabase>) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const isDevBypass =
    process.env.NODE_ENV !== 'production' &&
    token === 'dev-token' &&
    process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';

  if (!token && !isDevBypass) return 'Missing authorization';
  if (!isDevBypass) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return 'Invalid token';
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(req, supabase);
    if (authorizationError) {
      return NextResponse.json({ error: authorizationError }, { status: 401 });
    }

    const tournamentId = new URL(req.url).searchParams.get('tournamentId');
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!tournamentId) return NextResponse.json({ data: data ?? [] });

    const [pools, teams, matches] = await Promise.all([
      supabase.from('pool_groups').select('id,name,tournament_id').eq('tournament_id', tournamentId).order('name'),
      supabase
        .from('tournament_teams')
        .select('team_id,pool_group_id,participation_type,team:teams(id,name,city,province)')
        .eq('tournament_id', tournamentId),
      supabase
        .from('matches')
        .select(`
          id,match_number,tournament_id,pool_group_id,home_team_id,away_team_id,home_score,away_score,
          home_cap_color,away_cap_color,status,pool_location,scheduled_time,round_type,stage_type,
          stage_name,stage_order,home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name),pool_group:pool_groups(name)
        `)
        .eq('tournament_id', tournamentId)
        .order('scheduled_time', { ascending: true, nullsFirst: false }),
    ]);
    const queryError = pools.error || teams.error || matches.error;
    if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
    return NextResponse.json({
      data: data ?? [],
      pools: pools.data ?? [],
      teams: teams.data ?? [],
      matches: matches.data ?? [],
    });
  } catch (error) {
    console.error('Tournament admin GET failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load tournaments.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '') || null;

    // Dev bypass: accept a local dev-token when not in production
    const isDevBypass =
      process.env.NODE_ENV !== 'production' &&
      token === 'dev-token' &&
      process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';

    if (!token && !isDevBypass)
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });

    if (!isDevBypass) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user)
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const startDate = typeof body.startDate === 'string' && body.startDate ? body.startDate : null;
    const endDate = typeof body.endDate === 'string' && body.endDate ? body.endDate : null;
    const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null;
    const competitionCategory =
      body.competitionCategory === 'BOYS' || body.competitionCategory === 'GIRLS'
        ? body.competitionCategory
        : 'GIRLS';
    const status = typeof body.status === 'string' && body.status ? body.status : 'active';

    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    // Try real DB insert; if service role not configured in dev bypass, return a fake object
    const { data, error } = await supabase
      .from('tournaments')
      .insert([
        {
          name,
          status,
          start_date: startDate,
          end_date: endDate,
          location,
          competition_category: competitionCategory,
        },
      ])
      .select()
      .single();
    if (error) {
      if (isDevBypass) {
        const fake = { id: `dev-${Date.now()}`, name };
        return NextResponse.json({ data: fake });
      }
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ data, tournament: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
