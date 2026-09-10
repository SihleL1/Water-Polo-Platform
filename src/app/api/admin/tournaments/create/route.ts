import { NextResponse } from 'next/server';
import {
  createServerSupabase,
} from '@/lib/supabaseClient';

import type {
  DraftFixture,
  MatchSlot,
} from '@/lib/tournament-fixtures';

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getImmediateTeamId(
  slot: MatchSlot
): string | null {
  if (slot.type === 'TEAM') {
    return slot.teamId;
  }

  return null;
}

function getSlotReferenceId(
  slot: MatchSlot
): string | null {
  switch (slot.type) {
    case 'TEAM':
      return slot.teamId;

    case 'POOL_POSITION':
      return slot.poolId;

    case 'MATCH_WINNER':
      return slot.matchId;

    case 'MATCH_LOSER':
      return slot.matchId;

    default:
      return null;
  }
}

function getSlotPosition(
  slot: MatchSlot
): number | null {
  if (slot.type === 'POOL_POSITION') {
    return slot.position;
  }

  return null;
}

function isValidCapColor(
  value: unknown
): value is 'white' | 'blue' | 'dark' {
  return (
    value === 'white' ||
    value === 'blue' ||
    value === 'dark'
  );
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  req: Request
) {
  try {
    const supabase =
      createServerSupabase();

    const body = await req.json();

    const {
      tournament,
      pools = [],
      teams = [],
      matches = [],
    } = body;

    /*
     * ========================================================
     * BASIC VALIDATION
     * ========================================================
     */

    if (
      !tournament?.name?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            'Tournament name is required.',
        },
        { status: 400 }
      );
    }

    if (
      !tournament?.start_date
    ) {
      return NextResponse.json(
        {
          error:
            'Tournament start date is required.',
        },
        { status: 400 }
      );
    }

    if (
      !tournament?.end_date
    ) {
      return NextResponse.json(
        {
          error:
            'Tournament end date is required.',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(teams)) {
      return NextResponse.json(
        {
          error:
            'Teams must be an array.',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(pools)) {
      return NextResponse.json(
        {
          error:
            'Pools must be an array.',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(matches)) {
      return NextResponse.json(
        {
          error:
            'Matches must be an array.',
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * 1. CREATE TOURNAMENT
     * ========================================================
     */

    const {
      data: createdTournament,
      error: tournamentError,
    } = await supabase
      .from('tournaments')
      .insert({
         name: tournament.name.trim(),
         start_date: tournament.start_date,
         end_date: tournament.end_date,
         location: tournament.location?.trim() || null,
         status: tournament.status || 'active',
         competition_category:
        tournament.competition_category || 'BOYS',
})
      .select()
      .single();

    if (tournamentError) {
      console.error(
        'Tournament creation error:',
        tournamentError
      );

      return NextResponse.json(
        {
          error:
            tournamentError.message,
        },
        { status: 500 }
      );
    }

    /*
     * ========================================================
     * 2. CREATE POOLS
     *
     * Browser pool ID
     *       ↓
     * Database pool UUID
     * ========================================================
     */

    const poolIdMap =
      new Map<string, string>();

    for (const pool of pools) {
      if (
        !pool?.id ||
        !pool?.name?.trim()
      ) {
        continue;
      }

      const {
        data: createdPool,
        error: poolError,
      } = await supabase
        .from('pool_groups')
        .insert({
          name: pool.name.trim(),
          tournament_id:
            createdTournament.id,
        })
        .select()
        .single();

      if (poolError) {
        console.error(
          'Pool creation error:',
          poolError
        );

        throw new Error(
          `Pool "${pool.name}" could not be created: ${poolError.message}`
        );
      }

      poolIdMap.set(
        pool.id,
        createdPool.id
      );
    }

    /*
     * ========================================================
     * 3. CONNECT EXISTING SCHOOLS TO TOURNAMENT
     *
     * IMPORTANT:
     *
     * DO NOT insert into "teams".
     *
     * The school already exists in the permanent teams table.
     *
     * tournament_teams records the school's participation
     * in this particular tournament.
     * ========================================================
     */

    const tournamentTeamRows =
      teams
        .filter(
          (team: any) =>
            team?.id
        )
        .map(
          (team: {
            id: string;
            poolId:
              | string
              | null;
          }) => ({
            tournament_id:
              createdTournament.id,

            team_id:
              team.id,

            pool_group_id:
              team.poolId
                ? poolIdMap.get(
                    team.poolId
                  ) ?? null
                : null,
          })
        );

    if (
      tournamentTeamRows.length > 0
    ) {
      const {
        error:
          tournamentTeamsError,
      } = await supabase
        .from('tournament_teams')
        .insert(
          tournamentTeamRows
        );

      if (
        tournamentTeamsError
      ) {
        console.error(
          'Tournament teams error:',
          tournamentTeamsError
        );

        throw new Error(
          `Could not add schools to tournament: ${tournamentTeamsError.message}`
        );
      }
    }

    /*
     * ========================================================
     * 4. VALIDATE FIXTURE TEAM REFERENCES
     * ========================================================
     *
     * For a TEAM slot, make sure that school is actually
     * registered for this tournament.
     * ========================================================
     */

    const tournamentTeamIds =
      new Set(
        teams.map(
          (team: {
            id: string;
          }) => team.id
        )
      );

    /*
     * ========================================================
     * 5. CREATE MATCHES
     * ========================================================
     *
     * Fixed fixture:
     *
     *   TEAM → actual home_team_id
     *   TEAM → actual away_team_id
     *
     * Dynamic fixture:
     *
     *   POOL_POSITION → home_team_id = null
     *   MATCH_WINNER  → home_team_id = null
     *   MATCH_LOSER   → home_team_id = null
     *
     * The resolver will fill those later.
     * ========================================================
     */

    for (
      const fixture of matches as DraftFixture[]
    ) {
      if (!fixture?.id) {
        throw new Error(
          'A fixture is missing its ID.'
        );
      }

      if (
        !fixture.homeSlot ||
        !fixture.awaySlot
      ) {
        throw new Error(
          `Fixture ${fixture.id} is missing a home or away slot.`
        );
      }

      /*
       * ------------------------------------------------------
       * POOL REFERENCE
       * ------------------------------------------------------
       */

      const realPoolId =
        fixture.poolId
          ? poolIdMap.get(
              fixture.poolId
            ) ?? null
          : null;

      /*
       * ------------------------------------------------------
       * HOME TEAM
       * ------------------------------------------------------
       */

      const homeTeamId =
        getImmediateTeamId(
          fixture.homeSlot
        );

      if (
        fixture.homeSlot.type ===
          'TEAM' &&
        !tournamentTeamIds.has(
          fixture.homeSlot.teamId
        )
      ) {
        throw new Error(
          `Home school "${fixture.homeSlot.teamId}" is not registered for this tournament.`
        );
      }

      /*
       * ------------------------------------------------------
       * AWAY TEAM
       * ------------------------------------------------------
       */

      const awayTeamId =
        getImmediateTeamId(
          fixture.awaySlot
        );

      if (
        fixture.awaySlot.type ===
          'TEAM' &&
        !tournamentTeamIds.has(
          fixture.awaySlot.teamId
        )
      ) {
        throw new Error(
          `Away school "${fixture.awaySlot.teamId}" is not registered for this tournament.`
        );
      }

      /*
       * ------------------------------------------------------
       * CAP COLORS
       * ------------------------------------------------------
       */

      const homeCapColor =
        isValidCapColor(
          fixture.homeCapColor
        )
          ? fixture.homeCapColor
          : 'white';

      const awayCapColor =
        isValidCapColor(
          fixture.awayCapColor
        )
          ? fixture.awayCapColor
          : 'blue';

      /*
       * ------------------------------------------------------
       * INSERT MATCH
       * ------------------------------------------------------
       */

      const {
        error: matchError,
      } = await supabase
        .from('matches')
        .insert({
          id: fixture.id,

          tournament_id:
            createdTournament.id,

          pool_group_id:
            realPoolId,

          home_team_id:
            homeTeamId,

          away_team_id:
            awayTeamId,

          home_cap_color:
            homeCapColor,

          away_cap_color:
            awayCapColor,

          scheduled_time:
            fixture.scheduledTime ||
            null,

          status:
            'scheduled',

          /*
           * GENERIC TOURNAMENT STAGE
           */

          stage_type:
            fixture.stageType,

          stage_name:
            fixture.stageName,

          stage_order:
            fixture.stageOrder,

          match_number:
            fixture.matchNumber,

          /*
           * HOME SLOT
           */

          home_slot_type:
            fixture.homeSlot.type,

          home_slot_id:
            getSlotReferenceId(
              fixture.homeSlot
            ),

          home_slot_position:
            getSlotPosition(
              fixture.homeSlot
            ),

          /*
           * AWAY SLOT
           */

          away_slot_type:
            fixture.awaySlot.type,

          away_slot_id:
            getSlotReferenceId(
              fixture.awaySlot
            ),

          away_slot_position:
            getSlotPosition(
              fixture.awaySlot
            ),

          /*
           * Keep old round_type populated for
           * compatibility with existing code.
           */

          round_type:
            fixture.stageType,
        });

      if (matchError) {
        console.error(
          'Match creation error:',
          matchError
        );

        throw new Error(
          `Could not create fixture "${fixture.stageName} #${fixture.matchNumber}": ${matchError.message}`
        );
      }
    }

    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return NextResponse.json(
      {
        success: true,

        tournament:
          createdTournament,

        summary: {
          pools:
            pools.length,

          teams:
            teams.length,

          matches:
            matches.length,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      'Create tournament error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create tournament.',
      },
      {
        status: 500,
      }
    );
  }
}