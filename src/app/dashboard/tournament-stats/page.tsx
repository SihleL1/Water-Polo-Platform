'use client';

import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Category = 'BOYS' | 'GIRLS';

type Team = {
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

  goalsPerGame: number;
  assistsPerGame: number;

  offensiveReboundsPerGame: number;
  defensiveReboundsPerGame: number;
  reboundsPerGame: number;

  savesPerGame: number;
  blocksPerGame: number;
  stealsPerGame: number;

  goalPercentage: number;
  fiveMeterPenaltyPercentage: number;

  exclusionsPerGame: number;
  turnoversPerGame: number;

  sprintWinPercentage: number;
};

type Tournament = {
  id: string;
  name: string;
};

type ApiResponse = {
  data?: Team[];
  filters?: {
    tournaments: Tournament[];
    teams: {
      id: string;
      name: string;
      province: string;
    }[];
    pools: {
      id: string;
      name: string;
    }[];
    seasons: string[];
  };
  error?: string;
};

type Statistic = {
  key: keyof Team;
  label: string;
  suffix?: string;
  lowerIsBetter?: boolean;
};

const STATISTICS: Statistic[] = [
  {
    key: 'gamesPlayed',
    label: 'Games Played',
  },
  {
    key: 'gamesWon',
    label: 'Games Won',
  },
  {
    key: 'winPercentage',
    label: 'Win Percentage',
    suffix: '%',
  },
  {
    key: 'goalsPerGame',
    label: 'Goals per Game',
  },
  {
    key: 'assistsPerGame',
    label: 'Assists per Game',
  },
  {
    key: 'offensiveReboundsPerGame',
    label: 'Offensive Rebounds per Game',
  },
  {
    key: 'defensiveReboundsPerGame',
    label: 'Defensive Rebounds per Game',
  },
  {
    key: 'reboundsPerGame',
    label: 'Rebounds per Game',
  },
  {
    key: 'savesPerGame',
    label: 'Saves per Game',
  },
  {
    key: 'blocksPerGame',
    label: 'Blocks per Game',
  },
  {
    key: 'stealsPerGame',
    label: 'Steals per Game',
  },
  {
    key: 'goalPercentage',
    label: 'Goal Percentage',
    suffix: '%',
  },
  {
    key: 'fiveMeterPenaltyPercentage',
    label: '5M Penalty Percentage',
    suffix: '%',
  },
  {
    key: 'exclusionsPerGame',
    label: 'Exclusions per Game',
    lowerIsBetter: true,
  },
  {
    key: 'turnoversPerGame',
    label: 'Turnovers per Game',
    lowerIsBetter: true,
  },
  {
    key: 'sprintWinPercentage',
    label: 'Sprint Win %',
    suffix: '%',
  },
];

function TournamentStatsContent() {
  const searchParams =
    useSearchParams();

  const initialTournament =
    searchParams.get(
      'tournament'
    ) ?? 'ALL';

  const [category, setCategory] =
    useState<Category>('GIRLS');

  const [
    tournamentId,
    setTournamentId,
  ] = useState(
    initialTournament
  );

  const [data, setData] =
    useState<Team[]>([]);

  const [
    tournaments,
    setTournaments,
  ] = useState<Tournament[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    loadStats();
  }, [
    category,
    tournamentId,
  ]);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const params =
        new URLSearchParams();

      params.set(
        'category',
        category
      );

      params.set(
        'scope',
        'TEAM'
      );

      if (
        tournamentId !==
        'ALL'
      ) {
        params.set(
          'tournamentId',
          tournamentId
        );
      }

      const response =
        await fetch(
          `/api/dashboard/stats?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Failed to load tournament statistics.'
        );
      }

      setData(
        result.data ?? []
      );

      setTournaments(
        result.filters
          ?.tournaments ?? []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load tournament statistics.'
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedTournament =
    tournaments.find(
      (item) =>
        item.id ===
        tournamentId
    );

  const rankedStatistics =
    useMemo(() => {
      return STATISTICS.map(
        (statistic) => {
          const teams =
            [...data]
              .filter(
                (team) =>
                  team.gamesPlayed >
                  0
              )
              .sort(
                (a, b) => {
                  const aValue =
                    Number(
                      a[
                        statistic
                          .key
                      ] ?? 0
                    );

                  const bValue =
                    Number(
                      b[
                        statistic
                          .key
                      ] ?? 0
                    );

                  return statistic.lowerIsBetter
                    ? aValue -
                        bValue
                    : bValue -
                        aValue;
                }
              );

          return {
            ...statistic,
            teams,
          };
        }
      );
    }, [data]);

  const formatValue = (
    team: Team,
    statistic: Statistic
  ) => {
    const value =
      Number(
        team[
          statistic.key
        ] ?? 0
      );

    return statistic.suffix ===
      '%'
      ? `${value.toFixed(1)}%`
      : value.toFixed(1);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'var(--bg-soft)',
        color: '#0F172A',
      }}
    >
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <Link
            href="/dashboard"
            className="text-xs  uppercase tracking-[0.2em]"
            style={{
              color:
                'var(--veldt-ochre)',
            }}
          >
            ← Water Polo Stats
          </Link>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs  uppercase tracking-[0.2em] text-slate-400">
                Competition Statistics
              </p>

              <h1
                className="mt-1 text-3xl  md:text-5xl"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                Tournament Stats
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Team performance within a specific
                tournament.
              </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() =>
                  setCategory(
                    'BOYS'
                  )
                }
                className={`rounded-lg px-5 py-2.5 text-sm  ${
                  category ===
                  'BOYS'
                    ? 'text-white'
                    : 'text-slate-500'
                }`}
                style={
                  category ===
                  'BOYS'
                    ? {
                        background:
                          'var(--veldt-green)',
                      }
                    : undefined
                }
              >
                Boys
              </button>

              <button
                type="button"
                onClick={() =>
                  setCategory(
                    'GIRLS'
                  )
                }
                className={`rounded-lg px-5 py-2.5 text-sm  ${
                  category ===
                  'GIRLS'
                    ? 'text-black'
                    : 'text-slate-500'
                }`}
                style={
                  category ===
                  'GIRLS'
                    ? {
                        background:
                          'var(--veldt-ochre)',
                      }
                    : undefined
                }
              >
                Girls
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <label className="block max-w-2xl">
            <span className="text-xs  uppercase tracking-wider text-slate-500">
              Tournament
            </span>

            <select
              value={
                tournamentId
              }
              onChange={(event) =>
                setTournamentId(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border bg-white px-3 py-3 text-sm "
              style={{
                borderColor:
                  'var(--muted-slate)',
              }}
            >
              <option value="ALL">
                Select a Tournament
              </option>

              {tournaments.map(
                (tournament) => (
                  <option
                    key={
                      tournament.id
                    }
                    value={
                      tournament.id
                    }
                  >
                    {tournament.name}
                  </option>
                )
              )}
            </select>
          </label>
        </section>

        {selectedTournament && (
          <section
            className="rounded-3xl border bg-white p-6 shadow-sm"
            style={{
              borderColor:
                'var(--muted-slate)',
            }}
          >
            <p
              className="text-xs  uppercase tracking-[0.2em]"
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            >
              {category ===
              'BOYS'
                ? "Boys' Tournament"
                : "Girls' Tournament"}
            </p>

            <h2
              className="mt-2 text-2xl  md:text-4xl"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              {
                selectedTournament.name
              }
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {data.length} participating
              {data.length === 1
                ? ' team'
                : ' teams'}{' '}
              with statistics available.
            </p>
          </section>
        )}

        {!selectedTournament && (
          <section className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl ">
              Select a tournament
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Choose a tournament above to see
              every teams statistics.
            </p>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </section>
        )}

        {selectedTournament &&
          (loading ? (
            <section className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
              Loading tournament statistics...
            </section>
          ) : (
            <div className="space-y-6">
              {rankedStatistics.map(
                (statistic) => (
                  <section
                    key={String(
                      statistic.key
                    )}
                    className="overflow-hidden rounded-3xl border bg-white shadow-sm"
                  >
                    <div className="border-b px-5 py-5 md:px-6">
                      <p
                        className="text-xs  uppercase tracking-[0.2em]"
                        style={{
                          color:
                            'var(--veldt-ochre)',
                        }}
                      >
                        Tournament Leaderboard
                      </p>

                      <h2 className="mt-1 text-xl  md:text-2xl">
                        {statistic.label}
                      </h2>
                    </div>

                    <div className="divide-y">
                      {statistic.teams.map(
                        (
                          team,
                          index
                        ) => (
                          <Link
                            key={
                              team.id
                            }
                            href={`/dashboard/teams/${team.id}`}
                            className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 md:px-6"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs  text-slate-500">
                              {index +
                                1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate "
                                style={{
                                  color:
                                    'var(--veldt-green)',
                                }}
                              >
                                {team.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                {team.province ||
                                  'Province not set'}
                              </p>
                            </div>

                            <span className="text-lg ">
                              {formatValue(
                                team,
                                statistic
                              )}
                            </span>
                          </Link>
                        )
                      )}

                      {!statistic.teams.length && (
                        <div className="p-8 text-sm text-slate-500">
                          No completed games are available
                          for this statistic.
                        </div>
                      )}
                    </div>
                  </section>
                )
              )}
            </div>
          ))}
      </main>
    </div>
  );
}
export default function TournamentStatsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            background: 'var(--bg-soft)',
            color: 'var(--veldt-green)',
          }}
        >
          Loading tournament statistics...
        </div>
      }
    >
      <TournamentStatsContent />
    </Suspense>
  );
}