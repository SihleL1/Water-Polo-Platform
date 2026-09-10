import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

type Category = 'BOYS' | 'GIRLS' | 'MIXED';
type Scope = 'TEAM' | 'TOURNAMENT' | 'POOL';

type TeamRow = {
  id: string;
  name: string;
  city?: string | null;
  province?: string | null;
};

type TournamentRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  competition_category: Category | null;
  created_at: string | null;
};

type PoolRow = {
  id: string;
  tournament_id: string;
  name: string;
};

type TournamentTeamRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  pool_group_id: string | null;
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

  round_type: string | null;
  stage_type: string | null;
  stage_name: string | null;
  stage_order: number | null;
  match_number: number | null;

  pool_location: string | null;
  completed_at: string | null;
};

type MatchEventRow = {
  id: string;
  match_id: string;
  created_at: string;
  period: number | null;
  game_clock: string | null;
  team_id: string | null;
  primary_player_cap: number | null;
  secondary_player_cap: number | null;
  distance_zone: string | null;
  metadata: Record<string, unknown> | null;
  event_category: string;
};

type StatAccumulator = {
  played: number;
  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  points: number;

  totalShots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;

  saves: number;
  steals: number;
  turnovers: number;
  blocks: number;

  exclusionsDrawn: number;
  exclusionsCommitted: number;

  penaltiesTaken: number;
  penaltiesScored: number;
  penaltiesMissed: number;

  sprintsWon: number;
  sprintsLost: number;

  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;

  assists: number;

  possessions: number;

  completedMatchesWithStats: number;
};

type DashboardRow = {
  id: string;
  name: string;

  city: string | null;
  province: string | null;

  played: number;
  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;

  points: number;

  totalShots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;

  shootingPercentage: number | null;
  saves: number;
  steals: number;
  turnovers: number;
  blocks: number;

  exclusionsDrawn: number;
  exclusionsCommitted: number;

  penaltiesTaken: number;
  penaltiesScored: number;
  penaltiesMissed: number;
  penaltyPercentage: number | null;

  sprintsWon: number;
  sprintsLost: number;
  sprintAttempts: number;
  sprintWinPercentage: number | null;

  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  reboundsPerGame: number;

  assists: number;

  totalPossessions: number;

  offensiveEfficiency: number | null;
  defensiveEfficiency: number | null;
  netEfficiency: number | null;

  turnoverRate: number | null;

  completedMatchesWithStats: number;
};

type TournamentCard = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  competition_category: Category | null;

  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';

  matchCount: number;
  completedMatchCount: number;
  liveMatchCount: number;
  teamCount: number;
};

type RecentResult = {
  id: string;
  tournamentId: string | null;
  tournamentName: string;
  poolName: string | null;

  homeTeamId: string | null;
  awayTeamId: string | null;

  homeTeam: string;
  awayTeam: string;

  homeScore: number;
  awayScore: number;

  scheduledTime: string | null;
  completedAt: string | null;

  status: string | null;
};

type PoolSummary = {
  id: string;
  name: string;
  tournamentId: string;
  tournamentName: string;

  teamCount: number;
  matchCount: number;
  completedMatchCount: number;
};

type Definition = {
  key: string;
  label: string;
  description: string;
  available: boolean;
};

const COMPLETED_STATUSES = new Set([
  'COMPLETED',
  'FINAL',
  'FINISHED',
]);

const LIVE_STATUSES = new Set([
  'LIVE',
  'IN_PROGRESS',
  'RUNNING',
]);

function normalizeCategory(value: unknown): Category | null {
  if (value === 'BOYS' || value === 'GIRLS' || value === 'MIXED') {
    return value;
  }

  return null;
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase();
}

function isCompletedMatch(match: MatchRow) {
  return COMPLETED_STATUSES.has(normalizeStatus(match.status));
}

function isLiveMatch(match: MatchRow) {
  return LIVE_STATUSES.has(normalizeStatus(match.status));
}

function isUpcomingMatch(match: MatchRow) {
  return !isCompletedMatch(match) && !isLiveMatch(match);
}

function percentage(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function roundNumber(value: number | null, decimals = 2): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function createAccumulator(): StatAccumulator {
  return {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,

    goalsFor: 0,
    goalsAgainst: 0,

    points: 0,

    totalShots: 0,
    shotsOnTarget: 0,
    shotsOffTarget: 0,

    saves: 0,
    steals: 0,
    turnovers: 0,
    blocks: 0,

    exclusionsDrawn: 0,
    exclusionsCommitted: 0,

    penaltiesTaken: 0,
    penaltiesScored: 0,
    penaltiesMissed: 0,

    sprintsWon: 0,
    sprintsLost: 0,

    rebounds: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,

    assists: 0,

    possessions: 0,

    completedMatchesWithStats: 0,
  };
}

function buildDashboardRow(
  team: TeamRow,
  accumulator: StatAccumulator,
): DashboardRow {
  const totalShots = accumulator.totalShots;

  const shootingPercentage = percentage(
    accumulator.goalsFor,
    totalShots,
  );

  const penaltyPercentage = percentage(
    accumulator.penaltiesScored,
    accumulator.penaltiesTaken,
  );

  const sprintAttempts =
    accumulator.sprintsWon + accumulator.sprintsLost;

  const sprintWinPercentage = percentage(
    accumulator.sprintsWon,
    sprintAttempts,
  );

  const reboundsPerGame =
    accumulator.played > 0
      ? accumulator.rebounds / accumulator.played
      : 0;

  const offensiveEfficiency =
    accumulator.possessions > 0
      ? roundNumber(
          (accumulator.goalsFor / accumulator.possessions) * 100,
        )
      : null;

  const defensiveEfficiency =
    accumulator.possessions > 0
      ? null
      : null;

  /*
   * Defensive efficiency requires the number of possessions
   * used by the OPPOSING team while this team was defending.
   *
   * We intentionally leave it null here until possession tracking
   * is available for both teams. This prevents us from presenting
   * an invented efficiency figure.
   */

  const turnoverRate =
    accumulator.possessions > 0
      ? roundNumber(
          (accumulator.turnovers / accumulator.possessions) * 100,
        )
      : null;

  const netEfficiency =
    offensiveEfficiency !== null &&
    defensiveEfficiency !== null
      ? roundNumber(
          offensiveEfficiency - defensiveEfficiency,
        )
      : null;

  return {
    id: team.id,
    name: team.name,

    city: team.city ?? null,
    province: team.province ?? null,

    played: accumulator.played,
    wins: accumulator.wins,
    draws: accumulator.draws,
    losses: accumulator.losses,

    goalsFor: accumulator.goalsFor,
    goalsAgainst: accumulator.goalsAgainst,
    goalDiff: accumulator.goalsFor - accumulator.goalsAgainst,

    points: accumulator.points,

    totalShots,
    shotsOnTarget: accumulator.shotsOnTarget,
    shotsOffTarget: accumulator.shotsOffTarget,

    shootingPercentage:
      roundNumber(shootingPercentage) ?? null,

    saves: accumulator.saves,
    steals: accumulator.steals,
    turnovers: accumulator.turnovers,
    blocks: accumulator.blocks,

    exclusionsDrawn: accumulator.exclusionsDrawn,
    exclusionsCommitted: accumulator.exclusionsCommitted,

    penaltiesTaken: accumulator.penaltiesTaken,
    penaltiesScored: accumulator.penaltiesScored,
    penaltiesMissed: accumulator.penaltiesMissed,

    penaltyPercentage:
      roundNumber(penaltyPercentage) ?? null,

    sprintsWon: accumulator.sprintsWon,
    sprintsLost: accumulator.sprintsLost,
    sprintAttempts,

    sprintWinPercentage:
      roundNumber(sprintWinPercentage) ?? null,

    rebounds: accumulator.rebounds,
    offensiveRebounds: accumulator.offensiveRebounds,
    defensiveRebounds: accumulator.defensiveRebounds,

    reboundsPerGame:
      roundNumber(reboundsPerGame) ?? 0,

    assists: accumulator.assists,

    totalPossessions: accumulator.possessions,

    offensiveEfficiency,
    defensiveEfficiency,
    netEfficiency,

    turnoverRate,

    completedMatchesWithStats:
      accumulator.completedMatchesWithStats,
  };
}

function applyEvent(
  accumulator: StatAccumulator,
  event: MatchEventRow,
) {
  const category = String(event.event_category || '')
    .trim()
    .toUpperCase();

  switch (category) {
    case 'SHOT':
      accumulator.totalShots += 1;
      break;

    case 'SHOT_ON_TARGET':
      accumulator.totalShots += 1;
      accumulator.shotsOnTarget += 1;
      break;

    case 'MISSED_SHOT':
    case 'SHOT_OFF_TARGET':
      accumulator.totalShots += 1;
      accumulator.shotsOffTarget += 1;
      break;

    case 'GOAL':
      accumulator.totalShots += 1;
      accumulator.shotsOnTarget += 1;
      accumulator.goalsFor += 1;
      break;

    case 'PENALTY':
      accumulator.penaltiesTaken += 1;
      break;

    case 'PENALTY_GOAL':
      accumulator.penaltiesTaken += 1;
      accumulator.penaltiesScored += 1;
      accumulator.totalShots += 1;
      accumulator.shotsOnTarget += 1;
      accumulator.goalsFor += 1;
      break;

    case 'PENALTY_MISSED':
      accumulator.penaltiesTaken += 1;
      accumulator.penaltiesMissed += 1;
      break;

    case 'GOALKEEPER_SAVE':
      accumulator.saves += 1;
      break;

    case 'STEAL':
    case 'INTERCEPTION':
      accumulator.steals += 1;
      break;

    case 'TURNOVER':
      accumulator.turnovers += 1;
      break;

    case 'BLOCK':
      accumulator.blocks += 1;
      break;

    case 'EXCLUSION_EARNED':
    case 'EXCLUSION_DRAWN':
      accumulator.exclusionsDrawn += 1;
      break;

    case 'EXCLUSION_COMMITTED':
      accumulator.exclusionsCommitted += 1;
      break;

    case 'SPRINT_WON':
      accumulator.sprintsWon += 1;
      break;

    case 'SPRINT_LOST':
      accumulator.sprintsLost += 1;
      break;

    case 'OFFENSIVE_REBOUND':
      accumulator.rebounds += 1;
      accumulator.offensiveRebounds += 1;
      break;

    case 'DEFENSIVE_REBOUND':
      accumulator.rebounds += 1;
      accumulator.defensiveRebounds += 1;
      break;

    case 'REBOUND':
      accumulator.rebounds += 1;
      break;

    case 'ASSIST':
      accumulator.assists += 1;
      break;

    case 'POSSESSION_START':
      accumulator.possessions += 1;
      break;

    default:
      /*
       * Events such as PERIOD_END or other operational events
       * are intentionally ignored by the statistical accumulator.
       */
      break;
  }
}

function applyMatchResult(
  accumulator: StatAccumulator,
  goalsFor: number,
  goalsAgainst: number,
) {
  accumulator.played += 1;
  accumulator.goalsFor += 0;
  accumulator.goalsAgainst += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    accumulator.wins += 1;
    accumulator.points += 3;
  } else if (goalsFor === goalsAgainst) {
    accumulator.draws += 1;
    accumulator.points += 1;
  } else {
    accumulator.losses += 1;
  }
}

function getYear(dateValue: string | null): string {
  if (!dateValue) return 'UNKNOWN';

  const year = new Date(dateValue).getFullYear();

  return Number.isFinite(year)
    ? String(year)
    : 'UNKNOWN';
}

export async function GET(request: Request) {
  const supabase = createServerSupabase();

  try {
    const url = new URL(request.url);

    const categoryParam =
      url.searchParams.get('category') ?? 'GIRLS';

    const seasonParam =
      url.searchParams.get('season') ?? 'ALL';

    const tournamentId =
      url.searchParams.get('tournamentId') ?? 'ALL';

    const teamId =
      url.searchParams.get('teamId') ?? 'ALL';

    const poolId =
      url.searchParams.get('poolId') ?? 'ALL';

    const scopeParam =
      url.searchParams.get('scope') ?? 'TEAM';

    const category = normalizeCategory(categoryParam);

    if (!category) {
      return NextResponse.json(
        { error: 'Invalid competition category.' },
        { status: 400 },
      );
    }

    const scope: Scope =
      scopeParam === 'TOURNAMENT' ||
      scopeParam === 'POOL'
        ? scopeParam
        : 'TEAM';

    /*
     * ============================================================
     * 1. LOAD BASE DATA
     * ============================================================
     */

    const [
      tournamentsResponse,
      poolsResponse,
      teamsResponse,
      tournamentTeamsResponse,
      matchesResponse,
      eventsResponse,
    ] = await Promise.all([
      supabase
        .from('tournaments')
        .select(`
          id,
          name,
          start_date,
          end_date,
          location,
          competition_category,
          created_at
        `)
        .order('start_date', { ascending: false }),

      supabase
        .from('pool_groups')
        .select(`
          id,
          tournament_id,
          name
        `)
        .order('name', { ascending: true }),

      supabase
        .from('teams')
        .select(`
          id,
          name,
          city,
          province
        `)
        .order('name', { ascending: true }),

      supabase
        .from('tournament_teams')
        .select(`
          id,
          tournament_id,
          team_id,
          pool_group_id
        `),

      supabase
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
          round_type,
          stage_type,
          stage_name,
          stage_order,
          match_number,
          pool_location,
          completed_at
        `)
        .order('scheduled_time', { ascending: true }),

      supabase
        .from('match_events')
        .select(`
          id,
          match_id,
          created_at,
          period,
          game_clock,
          team_id,
          primary_player_cap,
          secondary_player_cap,
          distance_zone,
          metadata,
          event_category
        `)
        .order('created_at', { ascending: true }),
    ]);

    if (tournamentsResponse.error) {
      throw new Error(
        `Could not load tournaments: ${tournamentsResponse.error.message}`,
      );
    }

    if (poolsResponse.error) {
      throw new Error(
        `Could not load pools: ${poolsResponse.error.message}`,
      );
    }

    if (teamsResponse.error) {
      throw new Error(
        `Could not load teams: ${teamsResponse.error.message}`,
      );
    }

    if (tournamentTeamsResponse.error) {
      throw new Error(
        `Could not load tournament teams: ${tournamentTeamsResponse.error.message}`,
      );
    }

    if (matchesResponse.error) {
      throw new Error(
        `Could not load matches: ${matchesResponse.error.message}`,
      );
    }

    if (eventsResponse.error) {
      throw new Error(
        `Could not load match events: ${eventsResponse.error.message}`,
      );
    }

    const tournaments =
      (tournamentsResponse.data ?? []) as TournamentRow[];

    const pools =
      (poolsResponse.data ?? []) as PoolRow[];

    const teams =
      (teamsResponse.data ?? []) as TeamRow[];

    const tournamentTeams =
      (tournamentTeamsResponse.data ??
        []) as TournamentTeamRow[];

    const matches =
      (matchesResponse.data ?? []) as MatchRow[];

    const events =
      (eventsResponse.data ?? []) as MatchEventRow[];

    /*
     * ============================================================
     * 2. FILTER TO CATEGORY
     * ============================================================
     */

    const categoryTournaments = tournaments.filter(
      (tournament) =>
        normalizeCategory(
          tournament.competition_category,
        ) === category,
    );

    const categoryTournamentIds = new Set(
      categoryTournaments.map((tournament) => tournament.id),
    );

    let activeTournaments = categoryTournaments.filter(
      (tournament) => {
        if (tournamentId !== 'ALL') {
          return tournament.id === tournamentId;
        }

        if (seasonParam === 'ALL') {
          return true;
        }

        return getYear(tournament.start_date) === seasonParam;
      },
    );

    if (tournamentId !== 'ALL') {
      activeTournaments = categoryTournaments.filter(
        (tournament) =>
          tournament.id === tournamentId,
      );
    }

    const activeTournamentIds = new Set(
      activeTournaments.map((tournament) => tournament.id),
    );

    /*
     * ============================================================
     * 3. FILTER MATCHES
     * ============================================================
     */

    const activeMatches = matches.filter((match) => {
      if (
        !match.tournament_id ||
        !activeTournamentIds.has(match.tournament_id)
      ) {
        return false;
      }

      if (
        poolId !== 'ALL' &&
        match.pool_group_id !== poolId
      ) {
        return false;
      }

      if (teamId !== 'ALL') {
        if (
          match.home_team_id !== teamId &&
          match.away_team_id !== teamId
        ) {
          return false;
        }
      }

      return true;
    });

    const activeMatchIds = new Set(
      activeMatches.map((match) => match.id),
    );

    const activeEvents = events.filter((event) =>
      activeMatchIds.has(event.match_id),
    );

    /*
     * ============================================================
     * 4. LOOKUP MAPS
     * ============================================================
     */

    const teamMap = new Map<string, TeamRow>();

    for (const team of teams) {
      teamMap.set(team.id, team);
    }

    const tournamentMap = new Map<
      string,
      TournamentRow
    >();

    for (const tournament of tournaments) {
      tournamentMap.set(tournament.id, tournament);
    }

    const poolMap = new Map<string, PoolRow>();

    for (const pool of pools) {
      poolMap.set(pool.id, pool);
    }

    const eventsByMatch = new Map<
      string,
      MatchEventRow[]
    >();

    for (const event of activeEvents) {
      const existing =
        eventsByMatch.get(event.match_id) ?? [];

      existing.push(event);
      eventsByMatch.set(event.match_id, existing);
    }

    /*
     * ============================================================
     * 5. REGISTERED TEAMS
     * ============================================================
     */

    const registeredTournamentTeams =
      tournamentTeams.filter((entry) =>
        activeTournamentIds.has(entry.tournament_id),
      );

    const registeredTeamIds = new Set(
      registeredTournamentTeams.map(
        (entry) => entry.team_id,
      ),
    );

    /*
     * Also include teams appearing in active matches.
     * This prevents a team disappearing from the dashboard
     * if an old fixture exists but its tournament_teams row
     * is incomplete.
     */

    for (const match of activeMatches) {
      if (match.home_team_id) {
        registeredTeamIds.add(match.home_team_id);
      }

      if (match.away_team_id) {
        registeredTeamIds.add(match.away_team_id);
      }
    }

    /*
     * ============================================================
     * 6. TEAM STAT ACCUMULATION
     * ============================================================
     */

    const teamAccumulators = new Map<
      string,
      StatAccumulator
    >();

    const getAccumulator = (id: string) => {
      let accumulator = teamAccumulators.get(id);

      if (!accumulator) {
        accumulator = createAccumulator();
        teamAccumulators.set(id, accumulator);
      }

      return accumulator;
    };

    /*
     * First calculate official match results.
     * This is deliberately based on matches.home_score / away_score,
     * not GOAL events, because the official scoreboard is authoritative.
     */

    for (const match of activeMatches) {
      if (
        !isCompletedMatch(match) ||
        !match.home_team_id ||
        !match.away_team_id
      ) {
        continue;
      }

      const homeScore = Number(match.home_score ?? 0);
      const awayScore = Number(match.away_score ?? 0);

      const homeAccumulator = getAccumulator(
        match.home_team_id,
      );

      const awayAccumulator = getAccumulator(
        match.away_team_id,
      );

      homeAccumulator.played += 1;
      homeAccumulator.goalsFor += homeScore;
      homeAccumulator.goalsAgainst += awayScore;

      awayAccumulator.played += 1;
      awayAccumulator.goalsFor += awayScore;
      awayAccumulator.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        homeAccumulator.wins += 1;
        homeAccumulator.points += 3;
        awayAccumulator.losses += 1;
      } else if (awayScore > homeScore) {
        awayAccumulator.wins += 1;
        awayAccumulator.points += 3;
        homeAccumulator.losses += 1;
      } else {
        homeAccumulator.draws += 1;
        awayAccumulator.draws += 1;

        homeAccumulator.points += 1;
        awayAccumulator.points += 1;
      }
    }

    /*
     * Then calculate event-derived statistics.
     *
     * Important:
     * We DO NOT add goals to goalsFor here because official
     * match scores were already loaded above.
     *
     * Therefore event GOAL / PENALTY_GOAL is used for shooting
     * statistics, while match scores remain authoritative
     * for standings.
     */

    for (const event of activeEvents) {
      if (!event.team_id) {
        continue;
      }

      if (!registeredTeamIds.has(event.team_id)) {
        continue;
      }

      const accumulator = getAccumulator(
        event.team_id,
      );

      const category = String(event.event_category ?? '')
        .trim()
        .toUpperCase();

      switch (category) {
        case 'SHOT':
          accumulator.totalShots += 1;
          break;

        case 'SHOT_ON_TARGET':
          accumulator.totalShots += 1;
          accumulator.shotsOnTarget += 1;
          break;

        case 'MISSED_SHOT':
        case 'SHOT_OFF_TARGET':
          accumulator.totalShots += 1;
          accumulator.shotsOffTarget += 1;
          break;

        case 'GOAL':
          accumulator.totalShots += 1;
          accumulator.shotsOnTarget += 1;
          break;

        case 'PENALTY':
          accumulator.penaltiesTaken += 1;
          break;

        case 'PENALTY_GOAL':
          accumulator.penaltiesTaken += 1;
          accumulator.penaltiesScored += 1;
          accumulator.totalShots += 1;
          accumulator.shotsOnTarget += 1;
          break;

        case 'PENALTY_MISSED':
          accumulator.penaltiesTaken += 1;
          accumulator.penaltiesMissed += 1;
          break;

        case 'GOALKEEPER_SAVE':
          accumulator.saves += 1;
          break;

        case 'STEAL':
        case 'INTERCEPTION':
          accumulator.steals += 1;
          break;

        case 'TURNOVER':
          accumulator.turnovers += 1;
          break;

        case 'BLOCK':
          accumulator.blocks += 1;
          break;

        case 'EXCLUSION_EARNED':
        case 'EXCLUSION_DRAWN':
          accumulator.exclusionsDrawn += 1;
          break;

        case 'EXCLUSION_COMMITTED':
          accumulator.exclusionsCommitted += 1;
          break;

        case 'SPRINT_WON':
          accumulator.sprintsWon += 1;
          break;

        case 'SPRINT_LOST':
          accumulator.sprintsLost += 1;
          break;

        case 'OFFENSIVE_REBOUND':
          accumulator.rebounds += 1;
          accumulator.offensiveRebounds += 1;
          break;

        case 'DEFENSIVE_REBOUND':
          accumulator.rebounds += 1;
          accumulator.defensiveRebounds += 1;
          break;

        case 'REBOUND':
          accumulator.rebounds += 1;
          break;

        case 'ASSIST':
          accumulator.assists += 1;
          break;

        case 'POSSESSION_START':
          accumulator.possessions += 1;
          break;

        default:
          break;
      }
    }

    /*
     * ============================================================
     * 7. VALIDATED MATCH COUNTS
     * ============================================================
     */

    for (const match of activeMatches) {
      if (
        !isCompletedMatch(match) ||
        !match.home_team_id ||
        !match.away_team_id
      ) {
        continue;
      }

      const matchEvents =
        eventsByMatch.get(match.id) ?? [];

      if (matchEvents.length === 0) {
        continue;
      }

      getAccumulator(
        match.home_team_id,
      ).completedMatchesWithStats += 1;

      getAccumulator(
        match.away_team_id,
      ).completedMatchesWithStats += 1;
    }

    /*
     * ============================================================
     * 8. BUILD TEAM ROWS
     * ============================================================
     */

    const teamRows: DashboardRow[] = [];

    for (const teamId of registeredTeamIds) {
      const team = teamMap.get(teamId);

      if (!team) {
        continue;
      }

      const accumulator =
        teamAccumulators.get(teamId) ??
        createAccumulator();

      teamRows.push(
        buildDashboardRow(
          team,
          accumulator,
        ),
      );
    }

    teamRows.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.goalDiff !== a.goalDiff) {
        return b.goalDiff - a.goalDiff;
      }

      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }

      return a.name.localeCompare(b.name);
    });

    /*
     * ============================================================
     * 9. TOP TEAMS
     * ============================================================
     */

    const topTeams = [...teamRows]
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }

        if (b.goalDiff !== a.goalDiff) {
          return b.goalDiff - a.goalDiff;
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);

    /*
     * ============================================================
     * 10. TOURNAMENT STATUS CARDS
     * ============================================================
     */

    const tournamentCards: TournamentCard[] =
      activeTournaments.map((tournament) => {
        const tournamentMatches =
          matches.filter(
            (match) =>
              match.tournament_id ===
              tournament.id,
          );

        const completedMatchCount =
          tournamentMatches.filter(
            isCompletedMatch,
          ).length;

        const liveMatchCount =
          tournamentMatches.filter(
            isLiveMatch,
          ).length;

        const matchCount =
          tournamentMatches.length;

        const tournamentTeamIds = new Set(
          tournamentTeams
            .filter(
              (entry) =>
                entry.tournament_id ===
                tournament.id,
            )
            .map((entry) => entry.team_id),
        );

        for (const match of tournamentMatches) {
          if (match.home_team_id) {
            tournamentTeamIds.add(
              match.home_team_id,
            );
          }

          if (match.away_team_id) {
            tournamentTeamIds.add(
              match.away_team_id,
            );
          }
        }

        let status:
          | 'UPCOMING'
          | 'LIVE'
          | 'COMPLETED';

        if (liveMatchCount > 0) {
          status = 'LIVE';
        } else if (
          matchCount > 0 &&
          completedMatchCount === matchCount
        ) {
          status = 'COMPLETED';
        } else {
          const today = new Date();

          const start =
            tournament.start_date
              ? new Date(
                  `${tournament.start_date}T00:00:00`,
                )
              : null;

          const end =
            tournament.end_date
              ? new Date(
                  `${tournament.end_date}T23:59:59`,
                )
              : null;

          if (end && end < today) {
            status = 'COMPLETED';
          } else {
            status = 'UPCOMING';
          }

          if (start && start <= today && !end) {
            status = 'LIVE';
          }
        }

        return {
          id: tournament.id,
          name: tournament.name,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          location: tournament.location,
          competition_category:
            tournament.competition_category,

          status,

          matchCount,
          completedMatchCount,
          liveMatchCount,

          teamCount: tournamentTeamIds.size,
        };
      });

    /*
     * ============================================================
     * 11. RECENT RESULTS
     * ============================================================
     */

    const recentResults: RecentResult[] =
      [...activeMatches]
        .filter(isCompletedMatch)
        .sort((a, b) => {
          const aTime =
            new Date(
              a.completed_at ??
                a.scheduled_time ??
                0,
            ).getTime();

          const bTime =
            new Date(
              b.completed_at ??
                b.scheduled_time ??
                0,
            ).getTime();

          return bTime - aTime;
        })
        .slice(0, 10)
        .map((match) => {
          const tournament =
            match.tournament_id
              ? tournamentMap.get(
                  match.tournament_id,
                )
              : null;

          const pool =
            match.pool_group_id
              ? poolMap.get(
                  match.pool_group_id,
                )
              : null;

          return {
            id: match.id,

            tournamentId:
              match.tournament_id,

            tournamentName:
              tournament?.name ??
              'Unknown Tournament',

            poolName:
              pool?.name ?? null,

            homeTeamId:
              match.home_team_id,

            awayTeamId:
              match.away_team_id,

            homeTeam:
              match.home_team_id
                ? teamMap.get(
                    match.home_team_id,
                  )?.name ?? 'TBD'
                : 'TBD',

            awayTeam:
              match.away_team_id
                ? teamMap.get(
                    match.away_team_id,
                  )?.name ?? 'TBD'
                : 'TBD',

            homeScore:
              Number(match.home_score ?? 0),

            awayScore:
              Number(match.away_score ?? 0),

            scheduledTime:
              match.scheduled_time,

            completedAt:
              match.completed_at,

            status:
              match.status,
          };
        });

    /*
     * ============================================================
     * 12. POOL SUMMARIES
     * ============================================================
     */

    const poolSummaries: PoolSummary[] =
      pools
        .filter((pool) =>
          activeTournamentIds.has(
            pool.tournament_id,
          ),
        )
        .filter((pool) => {
          if (poolId === 'ALL') {
            return true;
          }

          return pool.id === poolId;
        })
        .map((pool) => {
          const poolTeams =
            tournamentTeams.filter(
              (entry) =>
                entry.tournament_id ===
                  pool.tournament_id &&
                entry.pool_group_id ===
                  pool.id,
            );

          const poolMatches =
            activeMatches.filter(
              (match) =>
                match.pool_group_id ===
                pool.id,
            );

          return {
            id: pool.id,
            name: pool.name,

            tournamentId:
              pool.tournament_id,

            tournamentName:
              tournamentMap.get(
                pool.tournament_id,
              )?.name ??
              'Unknown Tournament',

            teamCount:
              new Set(
                poolTeams.map(
                  (entry) =>
                    entry.team_id,
                ),
              ).size,

            matchCount:
              poolMatches.length,

            completedMatchCount:
              poolMatches.filter(
                isCompletedMatch,
              ).length,
          };
        });

    /*
     * ============================================================
     * 13. FILTER OPTIONS
     * ============================================================
     */

    const seasons = Array.from(
      new Set(
        categoryTournaments
          .map((tournament) =>
            getYear(
              tournament.start_date,
            ),
          )
          .filter(
            (year) =>
              year !== 'UNKNOWN',
          ),
      ),
    ).sort((a, b) =>
      Number(b) - Number(a),
    );

    const filterTournamentRows =
      categoryTournaments.filter(
        (tournament) => {
          if (seasonParam === 'ALL') {
            return true;
          }

          return (
            getYear(
              tournament.start_date,
            ) === seasonParam
          );
        },
      );

    const filterTournamentIds = new Set(
      filterTournamentRows.map(
        (tournament) =>
          tournament.id,
      ),
    );

    const filterTournamentTeams =
      tournamentTeams.filter((entry) =>
        filterTournamentIds.has(
          entry.tournament_id,
        ),
      );

    const filterTeamIds = new Set(
      filterTournamentTeams.map(
        (entry) => entry.team_id,
      ),
    );

    for (const match of matches) {
      if (
        match.tournament_id &&
        filterTournamentIds.has(
          match.tournament_id,
        )
      ) {
        if (match.home_team_id) {
          filterTeamIds.add(
            match.home_team_id,
          );
        }

        if (match.away_team_id) {
          filterTeamIds.add(
            match.away_team_id,
          );
        }
      }
    }

    const filterTeams = teams
      .filter((team) =>
        filterTeamIds.has(team.id),
      )
      .map((team) => ({
        id: team.id,
        name: team.name,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name),
      );

    const filterPools = pools
      .filter((pool) =>
        filterTournamentIds.has(
          pool.tournament_id,
        ),
      )
      .map((pool) => ({
        id: pool.id,
        name: pool.name,
        tournamentId:
          pool.tournament_id,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name),
      );

    /*
     * ============================================================
     * 14. DEFINITIONS / METHODOLOGY
     * ============================================================
     */

    const definitions: Definition[] = [
      {
        key: 'points',
        label: 'Points',
        description:
          '3 points for a win, 1 point for a draw, 0 for a loss.',
        available: true,
      },
      {
        key: 'goalDiff',
        label: 'Goal Difference',
        description:
          'Goals scored minus goals conceded using the official match score.',
        available: true,
      },
      {
        key: 'totalShots',
        label: 'Total Shots',
        description:
          'Recorded SHOT, SHOT_ON_TARGET, MISSED_SHOT and goal events.',
        available: true,
      },
      {
        key: 'shootingPercentage',
        label: 'Shooting %',
        description:
          'Goals scored divided by recorded shots.',
        available: true,
      },
      {
        key: 'saves',
        label: 'Goalkeeper Saves',
        description:
          'Recorded GOALKEEPER_SAVE events.',
        available: true,
      },
      {
        key: 'steals',
        label: 'Steals',
        description:
          'Recorded STEAL and INTERCEPTION events.',
        available: true,
      },
      {
        key: 'turnovers',
        label: 'Turnovers',
        description:
          'Recorded TURNOVER events.',
        available: true,
      },
      {
        key: 'blocks',
        label: 'Blocks',
        description:
          'Recorded BLOCK events.',
        available: true,
      },
      {
        key: 'exclusionsDrawn',
        label: 'Exclusions Drawn',
        description:
          'Recorded EXCLUSION_EARNED or EXCLUSION_DRAWN events.',
        available: true,
      },
      {
        key: 'exclusionsCommitted',
        label: 'Exclusions Committed',
        description:
          'Recorded EXCLUSION_COMMITTED events.',
        available: true,
      },
      {
        key: 'penaltyPercentage',
        label: 'Penalty %',
        description:
          'Penalty goals divided by penalties taken.',
        available: true,
      },
      {
        key: 'sprintWinPercentage',
        label: 'Sprint Win %',
        description:
          'Sprint wins divided by sprint attempts.',
        available: true,
      },
      {
        key: 'offensiveEfficiency',
        label: 'Offensive Efficiency',
        description:
          'Goals scored divided by recorded possessions.',
        available: activeEvents.some(
          (event) =>
            event.event_category ===
              'POSSESSION_START',
        ),
      },
      {
        key: 'defensiveEfficiency',
        label: 'Defensive Efficiency',
        description:
          'Goals conceded divided by opponent possessions.',
        available: activeEvents.some(
          (event) =>
            event.event_category ===
              'POSSESSION_START',
        ),
      },
      {
        key: 'netEfficiency',
        label: 'Net Efficiency',
        description:
          'Offensive efficiency minus defensive efficiency.',
        available: activeEvents.some(
          (event) =>
            event.event_category ===
              'POSSESSION_START',
        ),
      },
    ];

    /*
     * ============================================================
     * 15. RESPONSE
     * ============================================================
     */

    return NextResponse.json({
      data: teamRows,

      topTeams,

      tournaments: tournamentCards,

      recentResults,

      pools: poolSummaries,

      filters: {
        category,
        season: seasonParam,
        tournamentId,
        teamId,
        poolId,

        seasons,

        tournaments:
          filterTournamentRows.map(
            (tournament) => ({
              id: tournament.id,
              name: tournament.name,
              start_date:
                tournament.start_date,
              end_date:
                tournament.end_date,
              status:
                tournamentCards.find(
                  (card) =>
                    card.id ===
                    tournament.id,
                )?.status ??
                'UPCOMING',
            }),
          ),

        teams: filterTeams,

        pools: filterPools,
      },

      definitions,

      meta: {
        scope,

        category,

        tournamentCount:
          activeTournaments.length,

        matchCount:
          activeMatches.length,

        completedMatchCount:
          activeMatches.filter(
            isCompletedMatch,
          ).length,

        liveMatchCount:
          activeMatches.filter(
            isLiveMatch,
          ).length,

        upcomingMatchCount:
          activeMatches.filter(
            isUpcomingMatch,
          ).length,

        eventCount:
          activeEvents.length,

        registeredTeamCount:
          registeredTeamIds.size,

        categoryTournamentCount:
          categoryTournamentIds.size,
      },
    });
  } catch (error) {
    console.error(
      'DASHBOARD STATS ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load dashboard statistics.',
      },
      { status: 500 },
    );
  }
}