import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';
import { validateMatchStatistics } from '@/lib/match-stat-validation';

type RouteContext = {
  params: {
    matchId: string;
  };
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const supabase = createServerSupabase();
  const matchId = params.matchId;

  try {
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required.' },
        { status: 400 }
      );
    }

    // Load the match first.
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        tournament_id,
        pool_group_id,
        round_type,
        stage_type,
        stage_name,
        stage_order,
        match_number,
        home_slot_type,
        home_slot_id,
        home_slot_position,
        away_slot_type,
        away_slot_id,
        away_slot_position
      `)
      .eq('id', matchId)
      .single();

    if (matchError) {
      console.error('Failed to load match:', matchError);

      return NextResponse.json(
        { error: matchError.message },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found.' },
        { status: 404 }
      );
    }

    // Prevent a match from being completed twice.
    if (
      match.status === 'COMPLETED' ||
      match.status === 'FINAL' ||
      match.status === 'FINISHED'
    ) {
      return NextResponse.json(
        { error: 'This match has already been completed.' },
        { status: 400 }
      );
    }

    // Make sure both teams are assigned.
    if (!match.home_team_id || !match.away_team_id) {
      return NextResponse.json(
        { error: 'Both teams must be assigned before completing the match.' },
        { status: 400 }
      );
    }

    // Validate the statistical record.
    const validation = await validateMatchStatistics(
      supabase,
      match as any
    );

    console.log('Match statistics validation:', validation);

    const homeScore = Number(match.home_score ?? 0);
    const awayScore = Number(match.away_score ?? 0);

    const winnerTeamId =
      homeScore > awayScore
        ? match.home_team_id
        : awayScore > homeScore
          ? match.away_team_id
          : null;

    const loserTeamId =
      homeScore > awayScore
        ? match.away_team_id
        : awayScore > homeScore
          ? match.home_team_id
          : null;

    // Save completion state.
    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        statistics_validated: validation.valid,
        statistics_warnings: validation.warnings ?? [],
      })
      .eq('id', matchId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to complete match:', updateError);

      return NextResponse.json(
        {
          error: updateError.message,
          details: updateError,
        },
        { status: 500 }
      );
    }

    // Resolve fixtures that depend on this match winner/loser.
    if (winnerTeamId || loserTeamId) {
      const { data: dependentMatches, error: dependentError } =
        await supabase
          .from('matches')
          .select(`
            id,
            home_slot_type,
            home_slot_id,
            away_slot_type,
            away_slot_id,
            home_team_id,
            away_team_id
          `)
          .or(
            `home_slot_id.eq.${matchId},away_slot_id.eq.${matchId}`
          );

      if (dependentError) {
        console.error(
          'Failed to load dependent matches:',
          dependentError
        );
      } else if (dependentMatches?.length) {
        for (const dependentMatch of dependentMatches) {
          const updates: Record<string, string> = {};

          if (
            dependentMatch.home_slot_type === 'MATCH_WINNER' &&
            dependentMatch.home_slot_id === matchId &&
            winnerTeamId
          ) {
            updates.home_team_id = winnerTeamId;
          }

          if (
            dependentMatch.home_slot_type === 'MATCH_LOSER' &&
            dependentMatch.home_slot_id === matchId &&
            loserTeamId
          ) {
            updates.home_team_id = loserTeamId;
          }

          if (
            dependentMatch.away_slot_type === 'MATCH_WINNER' &&
            dependentMatch.away_slot_id === matchId &&
            winnerTeamId
          ) {
            updates.away_team_id = winnerTeamId;
          }

          if (
            dependentMatch.away_slot_type === 'MATCH_LOSER' &&
            dependentMatch.away_slot_id === matchId &&
            loserTeamId
          ) {
            updates.away_team_id = loserTeamId;
          }

          if (Object.keys(updates).length > 0) {
            const { error: dependentUpdateError } =
              await supabase
                .from('matches')
                .update(updates)
                .eq('id', dependentMatch.id);

            if (dependentUpdateError) {
              console.error(
                `Failed to update dependent match ${dependentMatch.id}:`,
                dependentUpdateError
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      validation,
      winner_team_id: winnerTeamId,
      loser_team_id: loserTeamId,
    });
  } catch (error) {
    console.error('Unexpected error completing match:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to complete match.',
      },
      { status: 500 }
    );
  }
}
