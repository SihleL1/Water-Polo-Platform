import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('matches')
      .select(
        `
        id, status, scheduled_time, tournament_id, home_cap_color, away_cap_color,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
        `
      )
      .order('scheduled_time', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error loading scorekeeper matches:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Scorekeeper matches API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load matches.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const isDevBypass =
      process.env.NODE_ENV !== 'production' &&
      token === 'dev-token' &&
      process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';

    if (!token && !isDevBypass) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    if (!isDevBypass) {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    const body = await req.json();
    const requiredIds = ['tournament_id', 'home_team_id', 'away_team_id'];
    if (requiredIds.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
      return NextResponse.json(
        { error: 'Tournament, home team, and away team are required.' },
        { status: 400 }
      );
    }

    if (body.home_team_id === body.away_team_id) {
      return NextResponse.json(
        { error: 'Home and away teams cannot be the same.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('matches')
      .insert({
        tournament_id: body.tournament_id,
        pool_group_id: body.pool_group_id || null,
        home_team_id: body.home_team_id,
        away_team_id: body.away_team_id,
        home_cap_color: body.home_cap_color || 'white',
        away_cap_color: body.away_cap_color || 'blue',
        status: body.status || 'scheduled',
        scheduled_time: body.scheduled_time || null,
        pool_location: body.pool_location || null,
        match_number: Number.isFinite(body.match_number) ? body.match_number : null,
        round_type: body.round_type || null,
        stage_type: body.stage_type || null,
        stage_name: body.stage_name || null,
        stage_order: Number.isFinite(body.stage_order) ? body.stage_order : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Fixture creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Fixture creation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule fixture.' },
      { status: 500 }
    );
  }
}
