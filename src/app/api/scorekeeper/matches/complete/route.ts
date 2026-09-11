import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';
import { validateMatchStatistics } from '@/lib/match-stat-validation';

type CompleteMatchBody = {
  homeScore: number;
  awayScore: number;
};

type RouteContext = {
  params: {
    matchId: string;
  };
};

export const dynamic = 'force-dynamic'; 

export async function POST(
  req: Request,
  { params }: RouteContext
) {
  try {
    const matchId = params.matchId;

    if (!matchId) {
      return NextResponse.json(
        {
          error: 'Match ID is required.',
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * READ REQUEST BODY
     * ========================================================
     */

    let body: CompleteMatchBody;

    try {
      body =
        (await req.json()) as CompleteMatchBody;
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON request body.',
        },
        { status: 400 }
      );
    }

    const homeScore = Number(
      body.homeScore
    );

    const awayScore = Number(
      body.awayScore
    );

    if (
      !Number.isInteger(homeScore) ||
      homeScore < 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid home score.',
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid away score.',
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * SUPABASE
     * ========================================================
     */

    const supabase =
      createServerSupabase();

    /*
     * ========================================================
     * LOAD MATCH
     * ========================================================
     */

    const {
      data: match,
      error: loadError,
    } = await supabase
      .from('matches')
      .select(`
        id,
        tournament_id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        stage_type,
        stage_name,
        match_number
      `)
      .eq('id', matchId)
      .single();

    if (loadError) {
      console.error(
        'LOAD MATCH ERROR:',
        loadError
      );

      return NextResponse.json(
        {
          error:
            loadError.message,
        },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          error: 'Match not found.',
        },
        { status: 404 }
      );
    }

    /*
     * ========================================================
     * PREVENT DOUBLE COMPLETION
     * ========================================================
     */

    const currentStatus =
      String(
        match.status ?? ''
      )
        .trim()
        .toUpperCase();

    if (
      currentStatus ===
        'COMPLETED' ||
      currentStatus === 'FINAL' ||
      currentStatus ===
        'FINISHED'
    ) {
      return NextResponse.json(
        {
          error:
            'This match has already been completed.',
        },
        { status: 409 }
      );
    }

    /*
     * ========================================================
     * VALIDATE TEAM ASSIGNMENT
     * ========================================================
     */

    if (
      !match.home_team_id ||
      !match.away_team_id
    ) {
      return NextResponse.json(
        {
          error:
            'Both teams must be assigned before the match can be completed.',
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * VALIDATE MATCH STATISTICS
     *
     * Important:
     * Validation warnings do NOT prevent completion.
     *
     * They are stored so the match can be completed,
     * while the dashboard can identify incomplete data.
     * ========================================================
     */

    const validation =
      await validateMatchStatistics(
        supabase,
        {
          ...match,
          home_score:
            homeScore,
          away_score:
            awayScore,
        }
      );

    /*
     * ========================================================
     * DETERMINE WINNER / LOSER
     * ========================================================
     */

    let winnerTeamId:
      | string
      | null = null;

    let loserTeamId:
      | string
      | null = null;

    if (
      homeScore >
      awayScore
    ) {
      winnerTeamId =
        match.home_team_id;

      loserTeamId =
        match.away_team_id;
    } else if (
      awayScore >
      homeScore
    ) {
      winnerTeamId =
        match.away_team_id;

      loserTeamId =
        match.home_team_id;
    }

    /*
     * ========================================================
     * COMPLETE THE MATCH
     * ========================================================
     */

    const {
      data: completedMatch,
      error: updateError,
    } = await supabase
      .from('matches')
      .update({
        home_score:
          homeScore,

        away_score:
          awayScore,

        status:
          'COMPLETED',

        completed_at:
          new Date().toISOString(),

        is_running:
          false,

        statistics_validated:
          validation.valid,

        statistics_warnings:
          validation.warnings,
      })
      .eq('id', matchId)
      .select()
      .single();

    if (updateError) {
      console.error(
        'COMPLETE MATCH UPDATE ERROR:',
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        { status: 500 }
      );
    }

    /*
     * ========================================================
     * RESOLVE DEPENDENT FIXTURES
     *
     * MATCH_WINNER / MATCH_LOSER
     * ========================================================
     */

    const {
      resolvedFixtures,
      readyFixtures,
    } =
      await resolveDependentFixtures(
        supabase,
        matchId,
        winnerTeamId,
        loserTeamId
      );

    /*
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      success: true,

      match:
        completedMatch,

      validation,

      result: {
        winnerTeamId,
        loserTeamId,
        draw:
          winnerTeamId ===
          null,
      },

      resolvedFixtures,

      readyFixtures,
    });
  } catch (error) {
    console.error(
      'COMPLETE MATCH ROUTE ERROR:',
      error
    );

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

/*
 * ============================================================
 * RESOLVE DEPENDENT MATCHES
 * ============================================================
 */

async function resolveDependentFixtures(
  supabase: ReturnType<
    typeof createServerSupabase
  >,
  sourceMatchId: string,
  winnerTeamId: string | null,
  loserTeamId: string | null
) {
  /*
   * Find every fixture whose home or away
   * slot points to the completed source match.
   */

  const {
    data: dependentMatches,
    error,
  } = await supabase
    .from('matches')
    .select(`
      id,
      home_team_id,
      away_team_id,

      home_slot_type,
      home_slot_id,

      away_slot_type,
      away_slot_id,

      status
    `)
    .or(
      `home_slot_id.eq.${sourceMatchId},away_slot_id.eq.${sourceMatchId}`
    );

  if (error) {
    throw new Error(
      `Could not find dependent fixtures: ${error.message}`
    );
  }

  let resolvedFixtures = 0;
  let readyFixtures = 0;

  for (
    const dependent of
      dependentMatches ?? []
  ) {
    const updates: Record<
      string,
      unknown
    > = {};

    /*
     * ========================================================
     * HOME SLOT
     * ========================================================
     */

    if (
      dependent.home_slot_id ===
      sourceMatchId
    ) {
      if (
        dependent.home_slot_type ===
          'MATCH_WINNER' &&
        winnerTeamId
      ) {
        updates.home_team_id =
          winnerTeamId;
      }

      if (
        dependent.home_slot_type ===
          'MATCH_LOSER' &&
        loserTeamId
      ) {
        updates.home_team_id =
          loserTeamId;
      }
    }

    /*
     * ========================================================
     * AWAY SLOT
     * ========================================================
     */

    if (
      dependent.away_slot_id ===
      sourceMatchId
    ) {
      if (
        dependent.away_slot_type ===
          'MATCH_WINNER' &&
        winnerTeamId
      ) {
        updates.away_team_id =
          winnerTeamId;
      }

      if (
        dependent.away_slot_type ===
          'MATCH_LOSER' &&
        loserTeamId
      ) {
        updates.away_team_id =
          loserTeamId;
      }
    }

    /*
     * ========================================================
     * NOTHING TO UPDATE
     * ========================================================
     */

    if (
      Object.keys(updates).length ===
      0
    ) {
      continue;
    }

    /*
     * ========================================================
     * DETERMINE WHETHER FIXTURE IS READY
     * ========================================================
     */

    const nextHomeTeamId =
      updates.home_team_id ??
      dependent.home_team_id;

    const nextAwayTeamId =
      updates.away_team_id ??
      dependent.away_team_id;

    if (
      nextHomeTeamId &&
      nextAwayTeamId
    ) {
      updates.status =
        'READY';

      readyFixtures += 1;
    }

    /*
     * ========================================================
     * UPDATE DEPENDENT FIXTURE
     * ========================================================
     */

    const {
      error: updateError,
    } = await supabase
      .from('matches')
      .update(updates)
      .eq(
        'id',
        dependent.id
      );

    if (updateError) {
      throw new Error(
        `Could not resolve fixture ${dependent.id}: ${updateError.message}`
      );
    }

    resolvedFixtures += 1;
  }

  return {
    resolvedFixtures,
    readyFixtures,
  };
}
