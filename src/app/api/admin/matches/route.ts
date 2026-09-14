import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

async function authorize(request: Request, supabase: ReturnType<typeof createServerSupabase>) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const isDevBypass = process.env.NODE_ENV !== 'production' && token === 'dev-token' && process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';
  if (!token && !isDevBypass) return 'Missing authorization';
  if (!isDevBypass) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return 'Invalid token';
  }
  return null;
}

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('matches').select(`
      id,match_number,tournament_id,pool_group_id,home_team_id,away_team_id,home_score,away_score,
      home_cap_color,away_cap_color,status,pool_location,scheduled_time,round_type,stage_type,stage_name,stage_order,
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name),
      pool_group:pool_groups(name)
    `).order('scheduled_time', { ascending: true, nullsFirst: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Matches GET failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load matches.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(request, supabase);
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 });

    const body = await request.json();
    const tournamentId = typeof body?.tournament_id === 'string' ? body.tournament_id.trim() : '';
    const homeTeamId = typeof body?.home_team_id === 'string' && body.home_team_id.trim() ? body.home_team_id.trim() : null;
    const awayTeamId = typeof body?.away_team_id === 'string' && body.away_team_id.trim() ? body.away_team_id.trim() : null;
    const poolGroupId = typeof body?.pool_group_id === 'string' && body.pool_group_id.trim() ? body.pool_group_id.trim() : null;
    const homeSlotType = typeof body?.home_slot_type === 'string' && body.home_slot_type.trim() ? body.home_slot_type.trim().toUpperCase() : null;
    const awaySlotType = typeof body?.away_slot_type === 'string' && body.away_slot_type.trim() ? body.away_slot_type.trim().toUpperCase() : null;
    const homeSlotId = typeof body?.home_slot_id === 'string' && body.home_slot_id.trim() ? body.home_slot_id.trim() : null;
    const awaySlotId = typeof body?.away_slot_id === 'string' && body.away_slot_id.trim() ? body.away_slot_id.trim() : null;
    const homeSlotPosition = Number.isInteger(body?.home_slot_position) ? body.home_slot_position : null;
    const awaySlotPosition = Number.isInteger(body?.away_slot_position) ? body.away_slot_position : null;

    if (!tournamentId) return NextResponse.json({ error: 'Tournament is required.' }, { status: 400 });
    const validSlotTypes = new Set(['MATCH_WINNER', 'MATCH_LOSER']);
    if (homeSlotType && !validSlotTypes.has(homeSlotType)) return NextResponse.json({ error: 'Invalid home slot type.' }, { status: 400 });
    if (awaySlotType && !validSlotTypes.has(awaySlotType)) return NextResponse.json({ error: 'Invalid away slot type.' }, { status: 400 });
    if (homeTeamId && homeSlotType) return NextResponse.json({ error: 'Home side cannot specify both a concrete team and a slot.' }, { status: 400 });
    if (awayTeamId && awaySlotType) return NextResponse.json({ error: 'Away side cannot specify both a concrete team and a slot.' }, { status: 400 });
    if (!homeTeamId && !homeSlotType) return NextResponse.json({ error: 'Home team or home slot is required.' }, { status: 400 });
    if (!awayTeamId && !awaySlotType) return NextResponse.json({ error: 'Away team or away slot is required.' }, { status: 400 });
    if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) return NextResponse.json({ error: 'Home and away teams cannot be the same.' }, { status: 400 });

    const sourceMatchIds = [homeSlotId, awaySlotId].filter(Boolean) as string[];
    if ((homeSlotType && !homeSlotId) || (awaySlotType && !awaySlotId)) {
      return NextResponse.json({ error: 'Winner/Loser slots must reference their source match.' }, { status: 400 });
    }

    const { data: tournament, error: tournamentError } = await supabase.from('tournaments').select('id').eq('id', tournamentId).maybeSingle();
    if (tournamentError) return NextResponse.json({ error: tournamentError.message }, { status: 500 });
    if (!tournament) return NextResponse.json({ error: 'Tournament was not found.' }, { status: 404 });

    if (poolGroupId) {
      const { data: pool, error: poolError } = await supabase.from('pool_groups').select('id,tournament_id').eq('id', poolGroupId).maybeSingle();
      if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 });
      if (!pool || pool.tournament_id !== tournamentId) return NextResponse.json({ error: 'The selected pool/group does not belong to this tournament.' }, { status: 400 });
    }

    const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
    if (teamIds.length) {
      const { data: teamRows, error: teamError } = await supabase.from('tournament_teams').select('team_id,tournament_id').eq('tournament_id', tournamentId).in('team_id', teamIds);
      if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });
      const registered = new Set((teamRows ?? []).map((row) => row.team_id));
      const missing = teamIds.find((id) => !registered.has(id));
      if (missing) return NextResponse.json({ error: 'Every concrete fixture team must be registered for this tournament.' }, { status: 400 });
    }

    if (sourceMatchIds.length) {
      const { data: sourceMatches, error: sourceError } = await supabase
        .from('matches')
        .select('id,tournament_id')
        .eq('tournament_id', tournamentId)
        .in('id', sourceMatchIds);
      if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
      const sourceSet = new Set((sourceMatches ?? []).map((row) => row.id));
      const missingSource = sourceMatchIds.find((id) => !sourceSet.has(id));
      if (missingSource) return NextResponse.json({ error: 'A Winner/Loser slot references a source match outside this tournament or a missing match.' }, { status: 400 });
    }

    const matchNumber = Number.isInteger(body?.match_number) ? body.match_number : null;
    if (matchNumber !== null) {
      const { data: duplicate, error: duplicateError } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).eq('match_number', matchNumber).maybeSingle();
      if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
      if (duplicate) return NextResponse.json({ error: `Match number ${matchNumber} already exists in this tournament.` }, { status: 409 });
    }

    const stageType = typeof body?.stage_type === 'string' && body.stage_type.trim() ? body.stage_type.trim().toUpperCase() : poolGroupId ? 'POOL' : null;
    const stageName = typeof body?.stage_name === 'string' && body.stage_name.trim() ? body.stage_name.trim() : poolGroupId ? 'Pool Stage' : null;
    const stageOrder = Number.isInteger(body?.stage_order) ? body.stage_order : poolGroupId ? 1 : null;

    const { data, error } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      pool_group_id: poolGroupId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_slot_type: homeSlotType,
      home_slot_id: homeSlotId,
      home_slot_position: homeSlotPosition,
      away_slot_type: awaySlotType,
      away_slot_id: awaySlotId,
      away_slot_position: awaySlotPosition,
      home_cap_color: body?.home_cap_color || 'white',
      away_cap_color: body?.away_cap_color || 'blue',
      home_score: 0,
      away_score: 0,
      period: 1,
      period_clock_seconds: 480,
      is_running: false,
      status: typeof body?.status === 'string' && body.status.trim() ? body.status.trim() : 'scheduled',
      scheduled_time: body?.scheduled_time || null,
      pool_location: typeof body?.pool_location === 'string' && body.pool_location.trim() ? body.pool_location.trim() : null,
      round_type: typeof body?.round_type === 'string' && body.round_type.trim() ? body.round_type.trim() : null,
      stage_type: stageType,
      stage_name: stageName,
      stage_order: stageOrder,
      match_number: matchNumber,
    }).select().single();

    if (error) {
      console.error('Fixture creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Fixture creation API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create fixture.' }, { status: 500 });
  }
}