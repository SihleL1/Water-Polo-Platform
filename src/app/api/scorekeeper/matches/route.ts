import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        scheduled_time,
        home_score,
        away_score,
        period,
        home_cap_color,
        away_cap_color,
        home_team_id,
        away_team_id,
        home_team:home_team_id (
          name
        ),
        away_team:away_team_id (
          name
        )
      `)
      .order('scheduled_time', { ascending: true })
      .limit(200);

    if (error) {
      console.error('LOAD SCOREKEEPER MATCHES ERROR:', error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (error) {
    console.error('SCOREKEEPER MATCHES ROUTE ERROR:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load matches.',
      },
      { status: 500 }
    );
  }
}