'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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

type ApiResponse = {
  data: Team[];
  filters: {
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

export default function AllTeamStatsPage() {
  const [category, setCategory] =
    useState<Category>('GIRLS');

  const [season, setSeason] =
    useState('ALL');

  const [data, setData] =
    useState<Team[]>([]);

  const [seasons, setSeasons] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const params =
          new URLSearchParams();

        params.set('category', category);
        params.set('season', season);
        params.set('scope', 'TEAM');

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
              'Failed to load team statistics.'
          );
        }

        setData(result.data ?? []);
        setSeasons(
          result.filters?.seasons ?? []
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load team statistics.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [category, season]);

  const formatValue = (
    team: Team,
    statistic: Statistic
  ) => {
    const value =
      Number(team[statistic.key] ?? 0);

    if (statistic.suffix === '%') {
      return `${value.toFixed(1)}%`;
    }

    return value.toFixed(1);
  };

  const rankedData = useMemo(() => {
    return STATISTICS.map(
      (statistic) => {
        const eligible =
          data.filter(
            (team) =>
              team.gamesPlayed > 0
          );

        const sorted =
          [...eligible].sort(
            (a, b) => {
              const aValue = Number(
                a[statistic.key] ?? 0
              );

              const bValue = Number(
                b[statistic.key] ?? 0
              );

              return statistic.lowerIsBetter
                ? aValue - bValue
                : bValue - aValue;
            }
          );

        return {
          ...statistic,
          teams: sorted,
        };
      }
    );
  }, [data]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg-soft)',
        color: '#0F172A',
      }}
    >
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <Link
            href="/dashboard"
            className="text-xs  uppercase tracking-[0.2em]"
            style={{
              color: 'var(--veldt-ochre)',
            }}
          >
            ← Water Polo Stats
          </Link>

          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs  uppercase tracking-[0.2em] text-slate-400">
                Team Statistics
              </p>

              <h1
                className="mt-1 text-3xl  md:text-5xl"
                style={{
                  color: 'var(--veldt-green)',
                }}
              >
                All Team Stats
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Full season statistical rankings for every
                participating school.
              </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() =>
                  setCategory('BOYS')
                }
                className={`rounded-lg px-5 py-2.5 text-sm  ${
                  category === 'BOYS'
                    ? 'text-white'
                    : 'text-slate-500'
                }`}
                style={
                  category === 'BOYS'
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
                onClick={() =>
                  setCategory('GIRLS')
                }
                className={`rounded-lg px-5 py-2.5 text-sm  ${
                  category === 'GIRLS'
                    ? 'text-black'
                    : 'text-slate-500'
                }`}
                style={
                  category === 'GIRLS'
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
          <div className="max-w-xs">
            <label className="text-xs  uppercase tracking-wider text-slate-500">
              Season
            </label>

            <select
              value={season}
              onChange={(event) =>
                setSeason(
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
                All Seasons
              </option>

              {seasons.map(
                (seasonItem) => (
                  <option
                    key={seasonItem}
                    value={seasonItem}
                  >
                    {seasonItem}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
            Loading team statistics...
          </div>
        ) : (
          <div className="space-y-6">
            {rankedData.map(
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
                      Season Leaderboard
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
                          key={team.id}
                          href={`/dashboard/teams/${team.id}`}
                          className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 md:px-6"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs  text-slate-500">
                            {index + 1}
                          </div>

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

                          <div className="text-right">
                                                      <p className="text-lg ">
                            {formatValue(
                              team,
                              statistic
                            )}
                          </p>
                        </div>
                      </Link>
                    )
                  )}

                  {!statistic.teams.length && (
                    <div className="px-5 py-8 text-sm text-slate-500">
                      No completed matches are available for this
                      statistic.
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

