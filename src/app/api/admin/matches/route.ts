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
        id,
        status,
        scheduled_time,
        tournament_id,
        home_cap_color,
        away_cap_color,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
        `
      )
      .order('scheduled_time', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error loading scorekeeper matches:', error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (err) {
    console.error('Scorekeeper matches API error:', err);

    return NextResponse.json(
      {
        error: String(err),
      },
      { status: 500 }
    );
  }
}
