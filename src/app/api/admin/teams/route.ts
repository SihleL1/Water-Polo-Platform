import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const VALID_PARTICIPATION_TYPES = ['STANDARD', 'INVITATIONAL', 'EXHIBITION'] as const;
type ParticipationType = (typeof VALID_PARTICIPATION_TYPES)[number];

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

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(request, supabase);
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 });

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const tournamentId = typeof body?.tournamentId === 'string' ? body.tournamentId.trim() : '';
    const poolGroupId = typeof body?.poolGroupId === 'string' && body.poolGroupId.trim() ? body.poolGroupId.trim() : null;
    const city = typeof body?.city === 'string' && body.city.trim() ? body.city.trim() : null;
    const province = typeof body?.province === 'string' && body.province.trim() ? body.province.trim() : null;
    const participationType: ParticipationType = VALID_PARTICIPATION_TYPES.includes(body?.participationType) ? body.participationType : 'STANDARD';

    if (!name) return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
    if (!tournamentId) return NextResponse.json({ error: 'Tournament ID is required.' }, { status: 400 });

    const { data: tournament, error: tournamentError } = await supabase.from('tournaments').select('id').eq('id', tournamentId).maybeSingle();
    if (tournamentError) return NextResponse.json({ error: tournamentError.message }, { status: 500 });
    if (!tournament) return NextResponse.json({ error: 'Tournament was not found.' }, { status: 404 });

    if (poolGroupId) {
      const { data: pool, error: poolError } = await supabase.from('pool_groups').select('id,tournament_id').eq('id', poolGroupId).maybeSingle();
      if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 });
      if (!pool || pool.tournament_id !== tournamentId) return NextResponse.json({ error: 'The selected pool/group does not belong to this tournament.' }, { status: 400 });
    }

    const { data: existingTeams, error: lookupError } = await supabase.from('teams').select('id,name,city,province').ilike('name', name);
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
    const existingTeam = (existingTeams ?? []).find((team) => team.name.trim().toLowerCase() === name.toLowerCase()) ?? null;

    let teamId: string;
    if (existingTeam) {
      teamId = existingTeam.id;
      const { error } = await supabase.from('teams').update({ city, province }).eq('id', teamId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { data: createdTeam, error } = await supabase.from('teams').insert({ name, city, province }).select('id,name,city,province').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      teamId = createdTeam.id;
    }

    const { data: existingParticipation, error: participationLookupError } = await supabase
      .from('tournament_teams')
      .select('id,tournament_id,team_id,pool_group_id,participation_type')
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (participationLookupError) return NextResponse.json({ error: participationLookupError.message }, { status: 500 });

    const participationPayload = {
      tournament_id: tournamentId,
      team_id: teamId,
      pool_group_id: poolGroupId,
      participation_type: participationType,
    };

    const participation = existingParticipation
      ? await supabase.from('tournament_teams').update({ pool_group_id: poolGroupId, participation_type: participationType }).eq('id', existingParticipation.id).select().single()
      : await supabase.from('tournament_teams').insert(participationPayload).select().single();

    if (participation.error) return NextResponse.json({ error: participation.error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      team: { id: teamId, name: existingTeam?.name ?? name, city, province },
      tournamentTeam: participation.data,
    }, { status: existingParticipation ? 200 : 201 });
  } catch (error) {
    console.error('Team registration API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to register team.' }, { status: 500 });
  }
}

