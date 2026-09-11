import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    teamId: string;
  };
};

type MatchRow = {
  id: string;
  tournament_id: string | null;
  pool_group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  scheduled_time: string | null;

  tournament?: {
    id?: string;
    name?: string;
    competition_category?: string;
    start_date?: string | null;
  } | null;

  pool_group?: {
    id?: string;
    name?: string;
  } | null;

  home_team?: {
    id?: string;
    name?: string;
    city?: string | null;
    province?: string | null;
  } | null;

  away_team?: {
    id?: string;
    name?: string;
    city?: string | null;
    province?: string | null;
  } | null;
};

type EventRow = {
  id: string;
  match_id: string;
  team_id: string | null;
  event_type: string;
};

type TeamStats = {
  goals: number;
  assists: number;

  offensiveRebounds: number;
  defensiveRebounds: number;

  saves: number;
  blocks: number;
  steals: number;

  turnovers: number;
  exclusions: number;

  shotsOnTarget: number;
  shotsOffTarget: number;

  fiveMeterPenaltyTaken: number;
  fiveMeterPenaltyScored: number;

  sprintWins: number;
  sprintAttempts: number;
};

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  try {
    const teamId = params.teamId;

    if (!teamId) {
      return NextResponse.json(
        {
          error:
            'Team ID is required.',
        },
        { status: 400 }
      );
    }

    const supabase =
      createServerSupabase();

    /*
     * ========================================================
     * TEAM
     * ========================================================
     */

    const {
      data: team,
      error: teamError,
    } = await supabase
      .from('teams')
      .select(
        'id,name,city,province'
      )
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error(
        'TEAM LOAD ERROR:',
        teamError
      );

      return NextResponse.json(
        {
          error:
            teamError.message,
        },
        { status: 500 }
      );
    }

    if (!team) {
      return NextResponse.json(
        {
          error: 'Team not found.',
        },
        { status: 404 }
      );
    }

    /*
     * ========================================================
     * MATCHES
     * ========================================================
     */

    const {
      data: matches,
      error: matchesError,
    } = await supabase
      .from('matches')
      .select(`
        id,
        tournament_id,
        pool_group_id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        scheduled_time,

        tournament:tournament_id (
          id,
          name,
          competition_category,
          start_date
        ),

        pool_group:pool_group_id (
          id,
          name
        ),

        home_team:home_team_id (
          id,
          name,
          city,
          province
        ),

        away_team:away_team_id (
          id,
          name,
          city,
          province
        )
      `)
      .or(
        `home_team_id.eq.${teamId},away_team_id.eq.${teamId}`
      )
      .eq('status', 'COMPLETED')
      .order('scheduled_time', {
        ascending: true,
      });

    if (matchesError) {
      console.error(
        'TEAM MATCHES ERROR:',
        matchesError
      );

      return NextResponse.json(
        {
          error:
            matchesError.message,
        },
        { status: 500 }
      );
    }

    const completedMatches =
      (matches ?? []) as MatchRow[];

    /*
     * ========================================================
     * FILTER TOURNAMENT CATEGORY
     * ========================================================
     */

    const category =
      getPrimaryCategory(
        completedMatches
      );

    const teamMatches =
      completedMatches.filter(
        (match) => {
          const matchCategory =
            String(
              match.tournament
                ?.competition_category ??
                ''
            ).toUpperCase();

          if (!matchCategory) {
            return true;
          }

          return (
            matchCategory ===
            category
          );
        }
      );

    /*
     * ========================================================
     * EVENTS
     * ========================================================
     */

    const matchIds =
      teamMatches.map(
        (match) => match.id
      );

    let events: EventRow[] = [];

    if (matchIds.length) {
      const {
        data: eventData,
        error: eventsError,
      } = await supabase
        .from('match_events')
        .select(
          'id,match_id,team_id,event_type'
        )
        .in(
          'match_id',
          matchIds
        );

      if (eventsError) {
        console.error(
          'TEAM EVENTS ERROR:',
          eventsError
        );

        return NextResponse.json(
          {
            error:
              eventsError.message,
          },
          { status: 500 }
        );
      }

      events =
        (eventData ??
          []) as EventRow[];
    }

    /*
     * ========================================================
     * SEASON
     * ========================================================
     */

    const season = getSeason(
      teamMatches
    );

    /*
     * ========================================================
     * TEAM EVENT STATS
     * ========================================================
     */

    const stats: TeamStats = {
      goals: 0,
      assists: 0,

      offensiveRebounds: 0,
      defensiveRebounds: 0,

      saves: 0,
      blocks: 0,
      steals: 0,

      turnovers: 0,
      exclusions: 0,

      shotsOnTarget: 0,
      shotsOffTarget: 0,

      fiveMeterPenaltyTaken: 0,
      fiveMeterPenaltyScored: 0,

      sprintWins: 0,
      sprintAttempts: 0,
    };

    for (const event of events) {
      if (event.team_id !== teamId) {
        continue;
      }

      switch (
        String(
          event.event_type
        ).toUpperCase()
      ) {
        case 'GOAL':
          stats.goals += 1;
          break;

        case 'PENALTY_SCORED':
          /*
           * A penalty scored is also a goal.
           * Do not increment GOAL here if your
           * scorekeeper writes both events.
           */
          stats.fiveMeterPenaltyScored += 1;
          break;

        case 'ASSIST':
          stats.assists += 1;
          break;

        case 'OFFENSIVE_REBOUND':
          stats.offensiveRebounds += 1;
          break;

        case 'DEFENSIVE_REBOUND':
          stats.defensiveRebounds += 1;
          break;

        case 'GOALKEEPER_SAVE':
          stats.saves += 1;
          break;

        case 'BLOCK':
          stats.blocks += 1;
          break;

        case 'STEAL':
          stats.steals += 1;
          break;

        case 'TURNOVER':
          stats.turnovers += 1;
          break;

        case 'EXCLUSION_COMMITTED':
          stats.exclusions += 1;
          break;

        case 'SHOT_ON_TARGET':
          stats.shotsOnTarget += 1;
          break;

        case 'SHOT_OFF_TARGET':
          stats.shotsOffTarget += 1;
          break;

        case 'PENALTY_TAKEN':
          stats.fiveMeterPenaltyTaken += 1;
          break;

        case 'SPRINT_WON':
          stats.sprintWins += 1;
          stats.sprintAttempts += 1;
          break;

        case 'SPRINT_LOST':
          stats.sprintAttempts += 1;
          break;

        default:
          break;
      }
    }

    /*
     * ========================================================
     * RECORD
     * ========================================================
     */

    let gamesPlayed = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let gamesDrawn = 0;

    let goalsFor = 0;
    let goalsAgainst = 0;

    const streakResults: string[] = [];

    const matchGames = teamMatches
      .map((match) => {
        const isHome =
          match.home_team_id ===
          teamId;

        const teamScore = isHome
          ? Number(
              match.home_score ?? 0
            )
          : Number(
              match.away_score ?? 0
            );

        const opponentScore = isHome
          ? Number(
              match.away_score ?? 0
            )
          : Number(
              match.home_score ?? 0
            );

        const opponent = isHome
          ? match.away_team?.name ??
            'TBD'
          : match.home_team?.name ??
            'TBD';

        let result:
          | 'W'
          | 'L'
          | 'D';

        if (
          teamScore >
          opponentScore
        ) {
          result = 'W';
          gamesWon += 1;
        } else if (
          teamScore <
          opponentScore
        ) {
          result = 'L';
          gamesLost += 1;
        } else {
          result = 'D';
          gamesDrawn += 1;
        }

        gamesPlayed += 1;

        goalsFor += teamScore;
        goalsAgainst += opponentScore;

        streakResults.push(result);

        return {
          id: match.id,

          date:
            match.scheduled_time,

          tournamentName:
            match.tournament?.name ??
            'Tournament',

          poolName:
            match.pool_group?.name ??
            null,

          opponent,

          homeAway: isHome
            ? ('HOME' as const)
            : ('AWAY' as const),

          teamScore,
          opponentScore,
          result,
        };
      })
      .reverse();

    /*
     * ========================================================
     * TOURNAMENT STATS
     * ========================================================
     */

    const tournamentMap =
      new Map<
        string,
        {
          id: string;
          name: string;
          gamesPlayed: number;
          gamesWon: number;
          gamesLost: number;
          gamesDrawn: number;
          goalsFor: number;
          goalsAgainst: number;
        }
      >();

    for (const match of teamMatches) {
      const id =
        match.tournament_id;

      if (!id) continue;

      const current =
        tournamentMap.get(id) ?? {
          id,
          name:
            match.tournament
              ?.name ??
            'Tournament',

          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          gamesDrawn: 0,

          goalsFor: 0,
          goalsAgainst: 0,
        };

      const isHome =
        match.home_team_id ===
        teamId;

      const teamScore = isHome
        ? Number(
            match.home_score ?? 0
          )
        : Number(
            match.away_score ?? 0
          );

      const opponentScore = isHome
        ? Number(
            match.away_score ?? 0
          )
        : Number(
            match.home_score ?? 0
          );

      current.gamesPlayed += 1;
      current.goalsFor +=
        teamScore;

      current.goalsAgainst +=
        opponentScore;

      if (
        teamScore >
        opponentScore
      ) {
        current.gamesWon += 1;
      } else if (
        teamScore <
        opponentScore
      ) {
        current.gamesLost += 1;
      } else {
        current.gamesDrawn += 1;
      }

      tournamentMap.set(
        id,
        current
      );
    }

    const tournaments =
      Array.from(
        tournamentMap.values()
      ).map((item) => ({
        id: item.id,
        name: item.name,

        gamesPlayed:
          item.gamesPlayed,

        gamesWon:
          item.gamesWon,

        gamesLost:
          item.gamesLost,

        gamesDrawn:
          item.gamesDrawn,

        winPercentage:
          item.gamesPlayed
            ? (item.gamesWon /
                item.gamesPlayed) *
              100
            : 0,

        goalsFor:
          item.goalsFor,

        goalsAgainst:
          item.goalsAgainst,

        goalDifference:
          item.goalsFor -
          item.goalsAgainst,
      }));

    /*
     * ========================================================
     * POOL STATS
     * ========================================================
     */

    const poolMap =
      new Map<
        string,
        {
          id: string;
          name: string;
          gamesPlayed: number;
          gamesWon: number;
          gamesLost: number;
          gamesDrawn: number;
          goalsFor: number;
          goalsAgainst: number;
        }
      >();

    for (const match of teamMatches) {
      const id =
        match.pool_group_id;

      if (!id) continue;

      const current =
        poolMap.get(id) ?? {
          id,

          name:
            match.pool_group
              ?.name ??
            'Pool',

          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          gamesDrawn: 0,

          goalsFor: 0,
          goalsAgainst: 0,
        };

      const isHome =
        match.home_team_id ===
        teamId;

      const teamScore = isHome
        ? Number(
            match.home_score ?? 0
          )
        : Number(
            match.away_score ?? 0
          );

      const opponentScore = isHome
        ? Number(
            match.away_score ?? 0
          )
        : Number(
            match.home_score ?? 0
          );

      current.gamesPlayed += 1;
      current.goalsFor +=
        teamScore;

      current.goalsAgainst +=
        opponentScore;

      if (
        teamScore >
        opponentScore
      ) {
        current.gamesWon += 1;
      } else if (
        teamScore <
        opponentScore
      ) {
        current.gamesLost += 1;
      } else {
        current.gamesDrawn += 1;
      }

      poolMap.set(id, current);
    }

    const pools =
      Array.from(
        poolMap.values()
      ).map((item) => ({
        id: item.id,
        name: item.name,

        gamesPlayed:
          item.gamesPlayed,

        gamesWon:
          item.gamesWon,

        gamesLost:
          item.gamesLost,

        gamesDrawn:
          item.gamesDrawn,

        winPercentage:
          item.gamesPlayed
            ? (item.gamesWon /
                item.gamesPlayed) *
              100
            : 0,

        goalsFor:
          item.goalsFor,

        goalsAgainst:
          item.goalsAgainst,

        goalDifference:
          item.goalsFor -
          item.goalsAgainst,
      }));

    /*
     * ========================================================
     * ADVANCED STATS
     * ========================================================
     */

    const totalShots =
      stats.shotsOnTarget +
      stats.shotsOffTarget;

    const games =
      gamesPlayed || 1;

    const estimatedPossessions =
      Math.max(
        1,
        totalShots +
          stats.turnovers
      );

    const offensiveEfficiency =
      (stats.goals /
        estimatedPossessions) *
      100;

    /*
     * For the team page, defensive
     * efficiency uses goals against
     * divided by the same temporary
     * possession proxy.
     *
     * Replace with true opponent
     * possessions when possession
     * tracking is added.
     */
    const defensiveEfficiency =
      (goalsAgainst /
        estimatedPossessions) *
      100;

    /*
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      data: {
        team: {
          id: team.id,
          name: team.name,
          city: team.city ?? '',
          province:
            team.province ?? '',
        },

        category: category as
          | 'BOYS'
          | 'GIRLS',

        season,

        record: {
          gamesPlayed,
          gamesWon,
          gamesLost,
          gamesDrawn,

          winPercentage:
            gamesPlayed
              ? (gamesWon /
                  gamesPlayed) *
                100
              : 0,

          streak:
            getStreak(
              streakResults
            ),

          goalsFor,
          goalsAgainst,

          goalDifference:
            goalsFor -
            goalsAgainst,
        },

        traditional: {
          goals:
            stats.goals,

          goalsPerGame:
            stats.goals / games,

          assists:
            stats.assists,

          assistsPerGame:
            stats.assists / games,

          offensiveRebounds:
            stats.offensiveRebounds,

          offensiveReboundsPerGame:
            stats.offensiveRebounds /
            games,

          defensiveRebounds:
            stats.defensiveRebounds,

          defensiveReboundsPerGame:
            stats.defensiveRebounds /
            games,

          saves:
            stats.saves,

          savesPerGame:
            stats.saves / games,

          blocks:
            stats.blocks,

          blocksPerGame:
            stats.blocks / games,

          steals:
            stats.steals,

          stealsPerGame:
            stats.steals / games,

          turnovers:
            stats.turnovers,

          turnoversPerGame:
            stats.turnovers / games,

          exclusions:
            stats.exclusions,

          exclusionsPerGame:
            stats.exclusions /
            games,

          shotsOnTarget:
            stats.shotsOnTarget,

          shotsOffTarget:
            stats.shotsOffTarget,

          totalShots,

          goalPercentage:
            totalShots
              ? (stats.goals /
                  totalShots) *
                100
              : 0,

          fiveMeterPenaltyTaken:
            stats.fiveMeterPenaltyTaken,

          fiveMeterPenaltyScored:
            stats.fiveMeterPenaltyScored,

          fiveMeterPenaltyPercentage:
            stats
              .fiveMeterPenaltyTaken
              ? (stats.fiveMeterPenaltyScored /
                  stats.fiveMeterPenaltyTaken) *
                100
              : 0,
        },

        advanced: {
          offensiveEfficiency,

          defensiveEfficiency,

          netEfficiency:
            offensiveEfficiency -
            defensiveEfficiency,

          sprintWins:
            stats.sprintWins,

          sprintAttempts:
            stats.sprintAttempts,

          sprintWinPercentage:
            stats.sprintAttempts
              ? (stats.sprintWins /
                  stats.sprintAttempts) *
                100
              : 0,
        },

        tournaments,

        pools,

        games,
      },
    });
  } catch (error) {
    console.error(
      'TEAM DASHBOARD API ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load team dashboard.',
      },
      { status: 500 }
    );
  }
}

function getPrimaryCategory(
  matches: MatchRow[]
) {
  for (const match of matches) {
    const category =
      String(
        match.tournament
          ?.competition_category ??
          ''
      ).toUpperCase();

    if (
      category === 'BOYS' ||
      category === 'GIRLS'
    ) {
      return category;
    }
  }

  return 'GIRLS';
}

function getSeason(
  matches: MatchRow[]
) {
  const years =
    matches
      .map(
        (match) =>
          match.tournament
            ?.start_date
      )
      .filter(Boolean)
      .map((date) =>
        new Date(
          date!
        ).getFullYear()
      )
      .filter(
        (year) =>
          Number.isFinite(year)
      );

  if (!years.length) {
    return null;
  }

  const counts =
    new Map<number, number>();

  for (const year of years) {
    counts.set(
      year,
      (counts.get(year) ?? 0) +
        1
    );
  }

  return String(
    Array.from(
      counts.entries()
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0][0]
  );
}

function getStreak(
  results: string[]
) {
  if (!results.length) {
    return '—';
  }

  const reversed = [
    ...results,
  ].reverse();

  const current =
    reversed[0];

  let count = 0;

  for (const result of reversed) {
    if (result === current) {
      count += 1;
    } else {
      break;
    }
  }

  return `${current}${count}`;
}
