'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

type Category = 'BOYS' | 'GIRLS';

type ApiDashboardRow = {
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

type DashboardRow = {
  id: string;
  name: string;
  province: string;

  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;

  winPercentage: number;
  streak: string;

  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;

  goalsPerGame: number;

  assists: number;
  assistsPerGame: number;

  offensiveRebounds: number;
  offensiveReboundsPerGame: number;

  defensiveRebounds: number;
  defensiveReboundsPerGame: number;

  totalRebounds: number;
  reboundsPerGame: number;

  saves: number;
  savesPerGame: number;

  blocks: number;
  blocksPerGame: number;

  steals: number;
  stealsPerGame: number;

  shotsOnTarget: number;
  shotsOffTarget: number;
  totalShots: number;

  goalPercentage: number;

  fiveMeterPenaltyTaken: number;
  fiveMeterPenaltyScored: number;
  fiveMeterPenaltyPercentage: number;

  exclusions: number;
  exclusionsPerGame: number;

  turnovers: number;
  turnoversPerGame: number;

  offensiveEfficiency: number | null;
  defensiveEfficiency: number | null;
  netEfficiency: number | null;

  sprintWins: number;
  sprintAttempts: number;
  sprintWinPercentage: number;
};

type TournamentCard = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;

  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';

  teamCount: number;
  fixtureCount: number;
  completedGames: number;
  goals: number;
  goalsPerGame: number;
};

type RecentResult = {
  id: string;
  date: string | null;
  tournament: string;
  homeTeam: string;
  awayTeam: string;

  homeTeamId: string | null;
  awayTeamId: string | null;

  homeScore: number;
  awayScore: number;

  status: string;
};

type PoolCard = {
  id: string;
  name: string;

  tournamentId?: string;
  tournamentName?: string;

  teamCount: number;
  completedGames: number;

  matchCount?: number;

  goals?: number;
  goalsPerGame?: number;
};

type DashboardResponse = {
  data: ApiDashboardRow[];
  topTeams: ApiDashboardRow[];

  tournaments: {
    id: string;
    name: string;

    start_date: string | null;
    end_date: string | null;

    location?: string | null;
    competition_category?: string | null;

    status: 'UPCOMING' | 'LIVE' | 'COMPLETED';

    matchCount: number;
    completedMatchCount: number;
    liveMatchCount: number;
    teamCount: number;
  }[];

  recentResults: RecentResult[];

  pools: PoolCard[];

  filters: {
    category?: string;
    season?: string;
    tournamentId?: string;
    teamId?: string;
    poolId?: string;

    seasons: string[];

    tournaments: {
      id: string;
      name: string;
      start_date?: string | null;
      end_date?: string | null;
      status?: string;
    }[];

    teams: {
      id: string;
      name: string;
      province?: string | null;
    }[];

    pools: {
      id: string;
      name: string;
      tournamentId?: string;
    }[];
  };

  definitions: {
    key: string;
    label: string;
    description: string;
    available: boolean;
  }[];

  error?: string;
};

type SortKey =
  | 'name'
  | 'gamesPlayed'
  | 'gamesWon'
  | 'gamesLost'
  | 'gamesDrawn'
  | 'winPercentage'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'goalDifference'
  | 'goalsPerGame'
  | 'assistsPerGame'
  | 'reboundsPerGame'
  | 'savesPerGame'
  | 'blocksPerGame'
  | 'stealsPerGame'
  | 'goalPercentage'
  | 'fiveMeterPenaltyPercentage'
  | 'exclusionsPerGame'
  | 'turnoversPerGame'
  | 'sprintWinPercentage';

type Leaderboard = {
  title: string;
  statKey: keyof DashboardRow;
  suffix: string;
  lowerIsBetter?: boolean;
};

const LEADERBOARDS: Leaderboard[] = [
  {
    title: 'Goals per Game',
    statKey: 'goalsPerGame',
    suffix: ' GPG',
  },
  {
    title: 'Assists per Game',
    statKey: 'assistsPerGame',
    suffix: ' APG',
  },
  {
    title: 'Rebounds per Game',
    statKey: 'reboundsPerGame',
    suffix: ' RPG',
  },
  {
    title: 'Saves per Game',
    statKey: 'savesPerGame',
    suffix: ' SPG',
  },
  {
    title: 'Blocks per Game',
    statKey: 'blocksPerGame',
    suffix: ' BPG',
  },
  {
    title: 'Steals per Game',
    statKey: 'stealsPerGame',
    suffix: ' StPG',
  },
  {
    title: 'Goal Percentage',
    statKey: 'goalPercentage',
    suffix: '%',
  },
  {
    title: '5M Penalty Percentage',
    statKey: 'fiveMeterPenaltyPercentage',
    suffix: '%',
  },
  {
    title: 'Sprint Win %',
    statKey: 'sprintWinPercentage',
    suffix: '%',
  },
  {
    title: 'Turnovers per Game',
    statKey: 'turnoversPerGame',
    suffix: ' TOPG',
    lowerIsBetter: true,
  },
  {
    title: 'Exclusions per Game',
    statKey: 'exclusionsPerGame',
    suffix: ' EXCL/G',
    lowerIsBetter: true,
  },
];

function safeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function perGame(value: number, games: number): number {
  if (!games) return 0;

  return value / games;
}

function percentage(numerator: number, denominator: number): number {
  if (!denominator) return 0;

  return (numerator / denominator) * 100;
}

function normalizeTeam(team: ApiDashboardRow): DashboardRow {
  const gamesPlayed = safeNumber(team.played);
  const gamesWon = safeNumber(team.wins);
  const gamesLost = safeNumber(team.losses);
  const gamesDrawn = safeNumber(team.draws);

  const goalsFor = safeNumber(team.goalsFor);
  const goalsAgainst = safeNumber(team.goalsAgainst);

  const goalDifference = safeNumber(team.goalDiff) || goalsFor - goalsAgainst;

  const assists = safeNumber(team.assists);

  const offensiveRebounds = safeNumber(team.offensiveRebounds);

  const defensiveRebounds = safeNumber(team.defensiveRebounds);

  const totalRebounds = safeNumber(team.rebounds);

  const saves = safeNumber(team.saves);
  const blocks = safeNumber(team.blocks);
  const steals = safeNumber(team.steals);

  const turnovers = safeNumber(team.turnovers);

  const exclusions = safeNumber(team.exclusionsDrawn) + safeNumber(team.exclusionsCommitted);

  const totalShots = safeNumber(team.totalShots);

  const shotsOnTarget = safeNumber(team.shotsOnTarget);

  const shotsOffTarget = safeNumber(team.shotsOffTarget);

  const penaltiesTaken = safeNumber(team.penaltiesTaken);

  const penaltiesScored = safeNumber(team.penaltiesScored);

  const sprintWins = safeNumber(team.sprintsWon);

  const sprintAttempts = safeNumber(team.sprintAttempts);

  /*
   * The API currently does not return a chronological
   * W/L streak, so we deliberately don't fabricate one.
   */
  const streak =
    gamesWon > 0 || gamesLost > 0 || gamesDrawn > 0
      ? `${gamesWon}W ${gamesLost}L${gamesDrawn ? ` ${gamesDrawn}D` : ''}`
      : '—';

  return {
    id: team.id,
    name: team.name,
    province: team.province ?? '',

    gamesPlayed,
    gamesWon,
    gamesLost,
    gamesDrawn,

    winPercentage: percentage(gamesWon, gamesPlayed),

    streak,

    goalsFor,
    goalsAgainst,
    goalDifference,
    points: safeNumber(team.points),

    goalsPerGame: perGame(goalsFor, gamesPlayed),

    assists,
    assistsPerGame: perGame(assists, gamesPlayed),

    offensiveRebounds,
    offensiveReboundsPerGame: perGame(offensiveRebounds, gamesPlayed),

    defensiveRebounds,
    defensiveReboundsPerGame: perGame(defensiveRebounds, gamesPlayed),

    totalRebounds,
    reboundsPerGame: perGame(totalRebounds, gamesPlayed),

    saves,
    savesPerGame: perGame(saves, gamesPlayed),

    blocks,
    blocksPerGame: perGame(blocks, gamesPlayed),

    steals,
    stealsPerGame: perGame(steals, gamesPlayed),

    shotsOnTarget,
    shotsOffTarget,
    totalShots,

    goalPercentage:
      team.shootingPercentage !== null
        ? safeNumber(team.shootingPercentage)
        : percentage(goalsFor, totalShots),

    fiveMeterPenaltyTaken: penaltiesTaken,

    fiveMeterPenaltyScored: penaltiesScored,

    fiveMeterPenaltyPercentage:
      team.penaltyPercentage !== null
        ? safeNumber(team.penaltyPercentage)
        : percentage(penaltiesScored, penaltiesTaken),

    exclusions,

    exclusionsPerGame: perGame(exclusions, gamesPlayed),

    turnovers,

    turnoversPerGame: perGame(turnovers, gamesPlayed),

    offensiveEfficiency: team.offensiveEfficiency,

    defensiveEfficiency: team.defensiveEfficiency,

    netEfficiency: team.netEfficiency,

    sprintWins,
    sprintAttempts,

    sprintWinPercentage:
      team.sprintWinPercentage !== null
        ? safeNumber(team.sprintWinPercentage)
        : percentage(sprintWins, sprintAttempts),
  };
}

export default function DashboardPage() {
  const [category, setCategory] = useState<Category>('GIRLS');

  const [season, setSeason] = useState('ALL');

  const [tournamentId, setTournamentId] = useState('ALL');

  const [teamId, setTeamId] = useState('ALL');

  const [poolId, setPoolId] = useState('ALL');

  const [data, setData] = useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('winPercentage');

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const dashboardTeams = useMemo(() => (data?.data ?? []).map(normalizeTeam), [data]);

  const normalizedTopTeams = useMemo(() => (data?.topTeams ?? []).map(normalizeTeam), [data]);

  const tournamentCards = useMemo<TournamentCard[]>(
    () =>
      (data?.tournaments ?? []).map((tournament) => ({
        id: tournament.id,
        name: tournament.name,

        startDate: tournament.start_date,

        endDate: tournament.end_date,

        status: tournament.status,

        teamCount: tournament.teamCount,

        fixtureCount: tournament.matchCount,

        completedGames: tournament.completedMatchCount,

        goals: 0,

        goalsPerGame: 0,
      })),
    [data]
  );

  useEffect(() => {
    loadDashboard();
  }, [category, season, tournamentId, teamId, poolId]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      params.set('category', category);

      params.set('season', season);

      params.set('tournamentId', tournamentId);

      params.set('teamId', teamId);

      params.set('poolId', poolId);

      params.set('scope', 'TEAM');

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`, {
        cache: 'no-store',
      });

      const result = (await response.json()) as DashboardResponse;

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to load dashboard.');
      }

      setData(result);
    } catch (err) {
      console.error('Dashboard load error:', err);

      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const selectedTeam = useMemo(() => {
    if (teamId === 'ALL' || !dashboardTeams.length) {
      return null;
    }

    return dashboardTeams.find((team) => team.id === teamId) ?? null;
  }, [dashboardTeams, teamId]);

  const sortedStandings = useMemo(() => {
    const rows = [...dashboardTeams];

    rows.sort((a, b) => {
      const aValue = a[sortKey];

      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aNumber = Number(aValue ?? 0);

      const bNumber = Number(bValue ?? 0);

      return sortDirection === 'asc' ? aNumber - bNumber : bNumber - aNumber;
    });

    return rows;
  }, [dashboardTeams, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));

      return;
    }

    setSortKey(key);
    setSortDirection('desc');
  };

  const formatNumber = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : '0.0');

  const formatPercentage = (value: number) => `${formatNumber(value)}%`;

  const liveTournaments = tournamentCards.filter((item) => item.status === 'LIVE');

  const upcomingTournaments = tournamentCards.filter((item) => item.status === 'UPCOMING');

  const completedTournaments = tournamentCards.filter((item) => item.status === 'COMPLETED');

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg-soft)',
        color: '#0F172A',
      }}
    >
      <Header />

      {/* ================================================== */}
      {/* HERO */}
      {/* ================================================== */}

      <section
        className="border-b"
        style={{
          background: 'linear-gradient(135deg, var(--veldt-green), #173417)',
          borderColor: 'var(--veldt-green)',
        }}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-6 md:py-14 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p
                className="text-xs  uppercase tracking-[0.28em]"
                style={{
                  color: 'var(--veldt-ochre)',
                }}
              >
                Veldt Analytics
              </p>

              <h1 className="mt-3 text-4xl tracking-tight text-white md:text-6xl">
                Water Polo Stats
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                Explore season standings, team performance, tournament activity, recent results and
                statistical leaders across South African school water polo.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-1 backdrop-blur">
              <button
                type="button"
                onClick={() => setCategory('BOYS')}
                className={`rounded-xl px-6 py-3 text-sm transition ${
                  category === 'BOYS' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                }`}
              >
                Boys
              </button>

              <button
                type="button"
                onClick={() => setCategory('GIRLS')}
                className={`rounded-xl px-6 py-3 text-sm transition ${
                  category === 'GIRLS' ? 'text-slate-900' : 'text-white/70 hover:text-white'
                }`}
                style={
                  category === 'GIRLS'
                    ? {
                        background: 'var(--veldt-ochre)',
                      }
                    : undefined
                }
              >
                Girls
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-4 py-6 md:px-6 md:py-8 lg:px-10">
        {/* ================================================== */}
        {/* FILTERS */}
        {/* ================================================== */}

        <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p
                className="text-xs uppercase tracking-[0.2em]"
                style={{
                  color: 'var(--veldt-ochre)',
                }}
              >
                Explore
              </p>

              <h2 className="mt-1 text-xl">Competition Filters</h2>

              <p className="mt-1 text-sm text-slate-500">
                Boys and girls competitions are kept completely separate.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSeason('ALL');
                setTournamentId('ALL');
                setTeamId('ALL');
                setPoolId('ALL');
              }}
              className="w-fit rounded-xl px-4 py-2 text-xs text-slate-500 transition hover:bg-slate-100"
            >
              Reset filters
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Filter
              label="Season"
              value={season}
              onChange={setSeason}
              options={[
                {
                  value: 'ALL',
                  label: 'All Seasons',
                },

                ...(data?.filters.seasons ?? []).map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
            />

            <Filter
              label="Tournament"
              value={tournamentId}
              onChange={setTournamentId}
              options={[
                {
                  value: 'ALL',
                  label: 'All Tournaments',
                },

                ...(data?.filters.tournaments ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />

            <Filter
              label="Team"
              value={teamId}
              onChange={setTeamId}
              options={[
                {
                  value: 'ALL',
                  label: 'All Teams',
                },

                ...(data?.filters.teams ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />

            <Filter
              label="Pool Group"
              value={poolId}
              onChange={setPoolId}
              options={[
                {
                  value: 'ALL',
                  label: 'All Pools',
                },

                ...(data?.filters.pools ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-red-700">Dashboard error</p>

            <p className="mt-1 text-sm text-red-600">{error}</p>
          </section>
        )}

        {/* ================================================== */}
        {/* LEAGUE LEADERS / TOP PERFORMING TEAMS */}
        {/* ================================================== */}

        <section>
          <SectionTitle
            eyebrow="League Leaders"
            title="Top Performing Teams"
            subtitle={`Top ${category.toLowerCase()} teams based on completed results.`}
          />

          {loading ? (
            <LoadingGrid count={5} />
          ) : normalizedTopTeams.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {normalizedTopTeams.map((team, index) => (
                <Link
                  key={team.id}
                  href={`/dashboard/teams/${team.id}`}
                  className="group rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm"
                      style={{
                        background: index === 0 ? 'var(--veldt-ochre)' : 'rgba(35,71,35,0.1)',
                        color: index === 0 ? '#111827' : 'var(--veldt-green)',
                      }}
                    >
                      {index + 1}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                      {team.streak}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg group-hover:underline">{team.name}</h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {team.province || 'Province not set'}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <MiniStat label="GP" value={team.gamesPlayed} />

                    <MiniStat label="Win %" value={formatPercentage(team.winPercentage)} />

                    <MiniStat
                      label="GD"
                      value={
                        team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference
                      }
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyCard text="No completed team results yet." />
          )}
        </section>

        {/* ================================================== */}
        {/* PERFORMANCE EXPLORER */}
        {/* ================================================== */}

        <section>
          <SectionTitle
            eyebrow="Performance Explorer"
            title="Team Performance"
            subtitle="The top five teams for each available statistic."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LEADERBOARDS.map((leaderboard) => (
              <PerformanceCard
                key={leaderboard.title}
                leaderboard={leaderboard}
                teams={dashboardTeams}
                formatNumber={formatNumber}
              />
            ))}

            <div className="flex min-h-full flex-col justify-between rounded-3xl border bg-white p-5 shadow-sm">
              <div>
                <p
                  className="text-xs uppercase tracking-wider"
                  style={{
                    color: 'var(--veldt-ochre)',
                  }}
                >
                  Full Rankings
                </p>

                <h3 className="mt-2 text-xl ">All Team Stats</h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Compare every participating school across every available season statistic.
                </p>
              </div>

              <Link
                href="/dashboard/team-stats"
                className="mt-6 inline-flex w-fit rounded-xl px-4 py-3 text-sm  text-white"
                style={{
                  background: 'var(--veldt-green)',
                }}
              >
                All Team Stats →
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* TOURNAMENTS */}
        {/* ================================================== */}

        <section>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionTitle
              eyebrow="Competitions"
              title="Tournaments"
              subtitle="Past, present and upcoming competitions."
            />

            <Link
              href="/dashboard/tournaments"
              className="mb-5 text-sm "
              style={{
                color: 'var(--veldt-green)',
              }}
            >
              View all tournaments →
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <TournamentColumn title="Live Now" status="LIVE" tournaments={liveTournaments} />

            <TournamentColumn
              title="Upcoming"
              status="UPCOMING"
              tournaments={upcomingTournaments}
            />

            <TournamentColumn
              title="Completed"
              status="COMPLETED"
              tournaments={completedTournaments}
            />
          </div>
        </section>

        {/* ================================================== */}
        {/* SELECTED TEAM */}
        {/* ================================================== */}

        {selectedTeam && (
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p
                  className="text-xs  uppercase tracking-[0.2em]"
                  style={{
                    color: 'var(--veldt-ochre)',
                  }}
                >
                  Selected Team
                </p>

                <h2
                  className="mt-1 text-3xl "
                  style={{
                    color: 'var(--veldt-green)',
                  }}
                >
                  {selectedTeam.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedTeam.province || 'Province not set'}
                </p>
              </div>

              <Link
                href={`/dashboard/teams/${selectedTeam.id}`}
                className="rounded-xl px-4 py-3 text-sm  text-white"
                style={{
                  background: 'var(--veldt-green)',
                }}
              >
                View Full Team Profile →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <MiniStat label="GP" value={selectedTeam.gamesPlayed} />

              <MiniStat label="W" value={selectedTeam.gamesWon} />

              <MiniStat label="L" value={selectedTeam.gamesLost} />

              <MiniStat label="Win %" value={formatPercentage(selectedTeam.winPercentage)} />

              <MiniStat label="GPG" value={formatNumber(selectedTeam.goalsPerGame)} />

              <MiniStat label="APG" value={formatNumber(selectedTeam.assistsPerGame)} />

              <MiniStat label="SPG" value={formatNumber(selectedTeam.savesPerGame)} />

              <MiniStat label="StPG" value={formatNumber(selectedTeam.stealsPerGame)} />
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* RECENT RESULTS */}
        {/* ================================================== */}

        <section id="results">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionTitle
              eyebrow="Results"
              title="Recent Results"
              subtitle="Latest completed matches in the selected competition."
            />

            <Link
              href="/dashboard/live"
              className="mb-5 text-sm "
              style={{
                color: 'var(--veldt-ochre)',
              }}
            >
              View Live →
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            {loading ? (
              <LoadingBox />
            ) : data?.recentResults?.length ? (
              <div className="divide-y">
                {data.recentResults.map((result) => (
                  <Link
                    key={result.id}
                    href={`/dashboard/matches/${result.id}`}
                    className="block px-5 py-5 transition hover:bg-slate-50 md:px-6"
                  >
                    <div className="grid gap-4 md:grid-cols-[170px_1fr_auto] md:items-center">
                      <div>
                        <p className="text-xs  uppercase tracking-wider text-slate-400">
                          {formatDate(result.date)}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-400">{result.tournament}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <TeamResult teamId={result.homeTeamId} name={result.homeTeam} />

                        <TeamResult teamId={result.awayTeamId} name={result.awayTeam} />
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-2xl ">
                          {result.homeScore} – {result.awayScore}
                        </p>

                        <p className="mt-1 text-[10px]  uppercase text-slate-400">Final</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyCard text="No completed results yet." />
            )}
          </div>
        </section>

        {/* ================================================== */}
        {/* STANDINGS */}
        {/* ================================================== */}

        <section>
          <SectionTitle
            eyebrow="Standings"
            title={`${category === 'BOYS' ? "Boys'" : "Girls'"} Season Standings`}
            subtitle="Click a heading to sort. Click a team to open its profile."
          />

          <div className="hidden overflow-hidden rounded-3xl border bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-4 text-left text-xs  uppercase tracking-wider text-slate-500">
                      #
                    </th>

                    <SortableHeader
                      label="Team"
                      active={sortKey === 'name'}
                      direction={sortDirection}
                      onClick={() => handleSort('name')}
                    />

                    {[
                      ['GP', 'gamesPlayed'],
                      ['W', 'gamesWon'],
                      ['L', 'gamesLost'],
                      ['D', 'gamesDrawn'],
                      ['Win %', 'winPercentage'],
                      ['GF', 'goalsFor'],
                      ['GA', 'goalsAgainst'],
                      ['GD', 'goalDifference'],
                      ['GPG', 'goalsPerGame'],
                      ['APG', 'assistsPerGame'],
                      ['RPG', 'reboundsPerGame'],
                      ['SPG', 'savesPerGame'],
                      ['BPG', 'blocksPerGame'],
                      ['StPG', 'stealsPerGame'],
                      ['Goal %', 'goalPercentage'],
                      ['5M %', 'fiveMeterPenaltyPercentage'],
                      ['TOPG', 'turnoversPerGame'],
                      ['EXCL/G', 'exclusionsPerGame'],
                      ['Sprint %', 'sprintWinPercentage'],
                    ].map(([label, key]) => (
                      <SortableHeader
                        key={key}
                        label={label}
                        active={sortKey === key}
                        direction={sortDirection}
                        onClick={() => handleSort(key as SortKey)}
                      />
                    ))}

                    <th className="px-4 py-4 text-right text-xs  uppercase tracking-wider text-slate-500">
                      Province
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedStandings.map((team, index) => (
                    <tr key={team.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-4  text-slate-400">{index + 1}</td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/teams/${team.id}`}
                          className=" hover:underline"
                          style={{
                            color: 'var(--veldt-green)',
                          }}
                        >
                          {team.name}
                        </Link>
                      </td>

                      <td className="px-4 py-4 text-right">{team.gamesPlayed}</td>

                      <td className="px-4 py-4 text-right ">{team.gamesWon}</td>

                      <td className="px-4 py-4 text-right">{team.gamesLost}</td>

                      <td className="px-4 py-4 text-right">{team.gamesDrawn}</td>

                      <td className="px-4 py-4 text-right ">
                        {formatPercentage(team.winPercentage)}
                      </td>

                      <td className="px-4 py-4 text-right">{team.goalsFor}</td>

                      <td className="px-4 py-4 text-right">{team.goalsAgainst}</td>

                      <td className="px-4 py-4 text-right ">
                        {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                      </td>

                      <td className="px-4 py-4 text-right">{formatNumber(team.goalsPerGame)}</td>

                      <td className="px-4 py-4 text-right">{formatNumber(team.assistsPerGame)}</td>

                      <td className="px-4 py-4 text-right">{formatNumber(team.reboundsPerGame)}</td>

                      <td className="px-4 py-4 text-right">{formatNumber(team.savesPerGame)}</td>

                      <td className="px-4 py-4 text-right">{formatNumber(team.blocksPerGame)}</td>

                      <td className="px-4 py-4 text-right">{formatNumber(team.stealsPerGame)}</td>

                      <td className="px-4 py-4 text-right">
                        {formatPercentage(team.goalPercentage)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatPercentage(team.fiveMeterPenaltyPercentage)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatNumber(team.turnoversPerGame)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatNumber(team.exclusionsPerGame)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatPercentage(team.sprintWinPercentage)}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-500">{team.province}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE STANDINGS */}

          <div className="space-y-3 md:hidden">
            {sortedStandings.map((team, index) => (
              <Link
                key={team.id}
                href={`/dashboard/teams/${team.id}`}
                className="block rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs "
                      style={{
                        background: 'rgba(35,71,35,0.1)',
                        color: 'var(--veldt-green)',
                      }}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <p className="">{team.name}</p>

                      <p className="text-xs text-slate-400">
                        {team.province || 'Province not set'}
                      </p>
                    </div>
                  </div>

                  <span
                    className="rounded-full px-2.5 py-1 text-xs "
                    style={{
                      background: 'rgba(216,145,59,0.15)',
                      color: 'var(--veldt-green)',
                    }}
                  >
                    {team.streak}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <MiniStat label="GP" value={team.gamesPlayed} />

                  <MiniStat label="W" value={team.gamesWon} />

                  <MiniStat label="Win %" value={formatPercentage(team.winPercentage)} />

                  <MiniStat
                    label="GD"
                    value={
                      team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference
                    }
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ================================================== */}
        {/* POOL GROUPS */}
        {/* ================================================== */}

        {data?.pools?.length ? (
          <section>
            <SectionTitle
              eyebrow="Competition Structure"
              title="Pool Groups"
              subtitle="Pool activity in the selected competition."
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.pools.map((pool) => (
                <div key={pool.id} className="rounded-3xl border bg-white p-5 shadow-sm">
                  <h3
                    className="text-xl "
                    style={{
                      color: 'var(--veldt-green)',
                    }}
                  >
                    {pool.name}
                  </h3>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <MiniStat label="Teams" value={pool.teamCount} />

                    <MiniStat label="Played" value={pool.completedGames} />

                    <MiniStat label="Matches" value={pool.matchCount ?? 0} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ================================================== */}
        {/* METHODOLOGY */}
        {/* ================================================== */}

        {data?.definitions?.length ? (
          <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
            <p
              className="text-xs  uppercase tracking-[0.2em]"
              style={{
                color: 'var(--veldt-ochre)',
              }}
            >
              Statistical Methodology
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {data.definitions.slice(0, 3).map((definition) => (
                <Definition
                  key={definition.key}
                  title={definition.label}
                  text={definition.description}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function PerformanceCard({
  leaderboard,
  teams,
  formatNumber,
}: {
  leaderboard: Leaderboard;
  teams: DashboardRow[];
  formatNumber: (value: number) => string;
}) {
  const ranked = [...teams]
    .filter((team) => team.gamesPlayed > 0)
    .filter((team) => {
      const value = team[leaderboard.statKey];

      return typeof value === 'number' && Number.isFinite(value);
    })
    .sort((a, b) => {
      const aValue = Number(a[leaderboard.statKey]);

      const bValue = Number(b[leaderboard.statKey]);

      return leaderboard.lowerIsBetter ? aValue - bValue : bValue - aValue;
    })
    .slice(0, 5);

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-xs  uppercase tracking-wider"
            style={{
              color: 'var(--veldt-ochre)',
            }}
          >
            Top 5
          </p>

          <h3 className="mt-1 text-lg ">{leaderboard.title}</h3>
        </div>

        <Link
          href="/dashboard/team-stats"
          className="text-xs "
          style={{
            color: 'var(--veldt-green)',
          }}
        >
          Full →
        </Link>
      </div>

      <div className="mt-4 divide-y">
        {ranked.map((team, index) => {
          const raw = Number(team[leaderboard.statKey] ?? 0);

          return (
            <Link
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              className="flex items-center gap-3 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs  text-slate-500">
                {index + 1}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm ">{team.name}</span>

              <span
                className="text-sm "
                style={{
                  color: 'var(--veldt-green)',
                }}
              >
                {formatNumber(raw)}
                {leaderboard.suffix}
              </span>
            </Link>
          );
        })}

        {!ranked.length && (
          <p className="py-3 text-sm text-slate-400">No completed statistics yet.</p>
        )}
      </div>
    </section>
  );
}

function TournamentColumn({
  title,
  status,
  tournaments,
}: {
  title: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  tournaments: TournamentCard[];
}) {
  return (
    <section className="rounded-3xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl ">{title}</h3>

          <span
            className={`rounded-full px-3 py-1 text-[10px]  tracking-wider ${
              status === 'LIVE'
                ? 'bg-red-100 text-red-700'
                : status === 'UPCOMING'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="divide-y">
        {tournaments.length ? (
          tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/dashboard/tournaments/${tournament.id}`}
              className="block p-5 hover:bg-slate-50"
            >
              <p
                className=""
                style={{
                  color: 'var(--veldt-green)',
                }}
              >
                {tournament.name}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {formatDateRange(tournament.startDate, tournament.endDate)}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Teams" value={tournament.teamCount} />

                <MiniStat label="Played" value={tournament.completedGames} />

                <MiniStat label="Fixtures" value={tournament.fixtureCount} />
              </div>
            </Link>
          ))
        ) : (
          <div className="p-5 text-sm text-slate-400">No tournaments in this category.</div>
        )}
      </div>
    </section>
  );
}

function TeamResult({ teamId, name }: { teamId: string | null; name: string }) {
  if (!teamId) {
    return <span className="">{name}</span>;
  }

  return (
    <Link
      href={`/dashboard/teams/${teamId}`}
      className=" hover:underline"
      style={{
        color: 'var(--veldt-green)',
      }}
    >
      {name}
    </Link>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs  uppercase tracking-wider text-slate-500">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border bg-white px-3 py-3 text-sm font-semibold outline-none"
        style={{
          borderColor: 'var(--muted-slate)',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <p
        className="text-xs  uppercase tracking-[0.2em]"
        style={{
          color: 'var(--veldt-ochre)',
        }}
      >
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl  md:text-3xl">{title}</h2>

      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-4 text-right">
      <button
        type="button"
        onClick={onClick}
        className={`text-xs  uppercase tracking-wider ${
          active ? 'text-slate-900' : 'text-slate-500'
        }`}
      >
        {label} <span>{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 text-center">
      <p className="text-[10px]  uppercase tracking-wider text-slate-400">{label}</p>

      <p className="mt-1 text-sm ">{value}</p>
    </div>
  );
}

function Definition({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="">{title}</p>

      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">{text}</div>
  );
}

function LoadingBox() {
  return (
    <div className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
      Loading...
    </div>
  );
}

function LoadingGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-3xl border bg-white shadow-sm" />
      ))}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Date not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) {
    return 'Dates not set';
  }

  const start = formatDate(startDate);

  if (!endDate) {
    return start;
  }

  return `${start} – ${formatDate(endDate)}`;
}
