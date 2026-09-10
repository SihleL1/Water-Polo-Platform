'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

type Category = 'BOYS' | 'GIRLS';

type TeamRow = {
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
};

type ApiResponse = {
  data: TeamRow[];
  tournaments: Tournament[];
  recentResults: RecentResult[];
  error?: string;
};

type SortKey =
  | 'name'
  | 'gamesPlayed'
  | 'gamesWon'
  | 'winPercentage'
  | 'goalsPerGame'
  | 'assistsPerGame'
  | 'savesPerGame'
  | 'stealsPerGame'
  | 'goalPercentage';

export default function TournamentDashboardPage() {
  const params = useParams();

  const tournamentId =
    typeof params?.tournamentId ===
    'string'
      ? params.tournamentId
      : '';

  const [
    category,
    setCategory,
  ] = useState<Category>('GIRLS');

  const [data, setData] =
    useState<ApiResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [sortKey, setSortKey] =
    useState<SortKey>(
      'winPercentage'
    );

  const [
    sortDirection,
    setSortDirection,
  ] = useState<'asc' | 'desc'>(
    'desc'
  );

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const search =
          new URLSearchParams();

        search.set(
          'category',
          category
        );

        search.set(
          'tournamentId',
          tournamentId
        );

        search.set(
          'scope',
          'TEAM'
        );

        const response =
          await fetch(
            `/api/dashboard/stats?${search.toString()}`,
            {
              cache: 'no-store',
            }
          );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              'Failed to load tournament.'
          );
        }

        setData(result);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load tournament.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [
    tournamentId,
    category,
  ]);

  const tournament =
    data?.tournaments.find(
      (item) =>
        item.id ===
        tournamentId
    );

  const sortedTeams =
    useMemo(() => {
      const rows =
        [...(data?.data ?? [])];

      rows.sort(
        (a, b) => {
          const aValue =
            a[sortKey];

          const bValue =
            b[sortKey];

          if (
            typeof aValue ===
              'string' &&
            typeof bValue ===
              'string'
          ) {
            return sortDirection ===
              'asc'
              ? aValue.localeCompare(
                  bValue
                )
              : bValue.localeCompare(
                  aValue
                );
          }

          return sortDirection ===
            'asc'
            ? Number(aValue) -
                Number(bValue)
            : Number(bValue) -
                Number(aValue);
        }
      );

      return rows;
    }, [
      data,
      sortKey,
      sortDirection,
    ]);

  const toggleSort = (
    key: SortKey
  ) => {
    if (sortKey === key) {
      setSortDirection(
        (current) =>
          current === 'asc'
            ? 'desc'
            : 'asc'
      );
      return;
    }

    setSortKey(key);
    setSortDirection('desc');
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
            href="/dashboard/tournaments"
            className="text-xs  uppercase tracking-[0.2em]"
            style={{
              color:
                'var(--veldt-ochre)',
            }}
          >
            ← All Tournaments
          </Link>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs  uppercase tracking-[0.2em] text-slate-400">
                Tournament Centre
              </p>

              <h1
                className="mt-1 text-3xl  md:text-5xl"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                {tournament?.name ??
                  'Tournament'}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {category === 'BOYS'
                  ? "Boys' competition"
                  : "Girls' competition"}{' '}
                • Tournament team statistics
              </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() =>
                  setCategory('BOYS')
                }
                className={`rounded-lg px-5 py-2.5 text-sm  ${
                  category === 'BOYS'
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
                  setCategory('GIRLS')
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
        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </section>
        )}

        {loading ? (
          <LoadingCard />
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Teams"
                value={data?.data.length ?? 0}
              />

              <StatCard
                label="Games Played"
                value={
                  data?.data.reduce(
                    (sum, team) =>
                      sum +
                      team.gamesPlayed,
                    0
                  ) ?? 0
                }
              />

              <StatCard
                label="Wins"
                value={
                  data?.data.reduce(
                    (sum, team) =>
                      sum +
                      team.gamesWon,
                    0
                  ) ?? 0
                }
              />

              <StatCard
                label="Goals"
                value={
                  data?.data.reduce(
                    (sum, team) =>
                      sum +
                      team.goalsFor,
                    0
                  ) ?? 0
                }
                highlight
              />
            </section>

            <section className="rounded-3xl border bg-white shadow-sm">
              <div className="border-b p-5 md:p-6">
                <p
                  className="text-xs  uppercase tracking-[0.2em]"
                  style={{
                    color:
                      'var(--veldt-ochre)',
                  }}
                >
                  Tournament Teams
                </p>

                <h2 className="mt-1 text-2xl ">
                  Team Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Click a school to open its full team profile.
                </p>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1050px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <SortHeader
                        label="Team"
                        active={
                          sortKey ===
                          'name'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'name'
                          )
                        }
                        align="left"
                      />

                      <SortHeader
                        label="GP"
                        active={
                          sortKey ===
                          'gamesPlayed'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'gamesPlayed'
                          )
                        }
                      />

                      <SortHeader
                        label="W"
                        active={
                          sortKey ===
                          'gamesWon'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'gamesWon'
                          )
                        }
                      />

                      <th className="px-4 py-4 text-right text-xs  uppercase tracking-wider text-slate-500">
                        L
                      </th>

                      <SortHeader
                        label="Win %"
                        active={
                          sortKey ===
                          'winPercentage'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'winPercentage'
                          )
                        }
                      />

                      <th className="px-4 py-4 text-right text-xs  uppercase tracking-wider text-slate-500">
                        GF
                      </th>

                      <th className="px-4 py-4 text-right text-xs  uppercase tracking-wider text-slate-500">
                        GA
                      </th>

                      <th className="px-4 py-4 text-right text-xs  uppercase tracking-wider text-slate-500">
                        GD
                      </th>

                      <SortHeader
                        label="GPG"
                        active={
                          sortKey ===
                          'goalsPerGame'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'goalsPerGame'
                          )
                        }
                      />

                      <SortHeader
                        label="APG"
                        active={
                          sortKey ===
                          'assistsPerGame'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'assistsPerGame'
                          )
                        }
                      />

                      <SortHeader
                        label="SPG"
                        active={
                          sortKey ===
                          'savesPerGame'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'savesPerGame'
                          )
                        }
                      />

                      <SortHeader
                        label="StPG"
                        active={
                          sortKey ===
                          'stealsPerGame'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'stealsPerGame'
                          )
                        }
                      />

                      <SortHeader
                        label="Goal %"
                        active={
                          sortKey ===
                          'goalPercentage'
                        }
                        direction={
                          sortDirection
                        }
                        onClick={() =>
                          toggleSort(
                            'goalPercentage'
                          )
                        }
                      />

                      <th className="px-4 py-4 text-right text-xs  uppercase tracking-wider text-slate-500">
                        Province
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedTeams.map(
                      (team, index) => (
                        <tr
                          key={
                            team.id
                          }
                          className="border-b last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs  text-slate-500">
                                {index +
                                  1}
                              </span>

                              <Link
                                href={`/dashboard/teams/${team.id}`}
                                className=" hover:underline"
                                style={{
                                  color:
                                    'var(--veldt-green)',
                                }}
                              >
                                {
                                  team.name
                                }
                              </Link>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            {
                              team.gamesPlayed
                            }
                          </td>

                          <td className="px-4 py-4 text-right ">
                            {
                              team.gamesWon
                            }
                          </td>

                          <td className="px-4 py-4 text-right">
                            {
                              team.gamesLost
                            }
                          </td>

                          <td className="px-4 py-4 text-right ">
                            {team.winPercentage.toFixed(
                              1
                            )}
                            %
                          </td>

                          <td className="px-4 py-4 text-right">
                            {
                              team.goalsFor
                            }
                          </td>

                          <td className="px-4 py-4 text-right">
                            {
                              team.goalsAgainst
                            }
                          </td>

                          <td className="px-4 py-4 text-right ">
                            {team.goalDifference >
                            0
                              ? `+${team.goalDifference}`
                              : team.goalDifference}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {team.goalsPerGame.toFixed(
                              1
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {team.assistsPerGame.toFixed(
                              1
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {team.savesPerGame.toFixed(
                              1
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {team.stealsPerGame.toFixed(
                              1
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {team.goalPercentage.toFixed(
                              1
                            )}
                            %
                          </td>

                          <td className="px-4 py-4 text-right text-slate-500">
                            {
                              team.province
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {sortedTeams.map(
                  (team, index) => (
                    <Link
                      key={
                        team.id
                      }
                      href={`/dashboard/teams/${team.id}`}
                      className="block rounded-2xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs ">
                            {index +
                              1}
                          </span>

                          <div>
                            <p className="">
                              {
                                team.name
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              {
                                team.province
                              }
                            </p>
                          </div>
                        </div>

                        <span className="">
                          {team.winPercentage.toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <MiniStat
                          label="GP"
                          value={
                            team.gamesPlayed
                          }
                        />

                        <MiniStat
                          label="W"
                          value={
                            team.gamesWon
                          }
                        />

                        <MiniStat
                          label="GPG"
                          value={team.goalsPerGame.toFixed(
                            1
                          )}
                        />

                        <MiniStat
                          label="GD"
                          value={
                            team.goalDifference >
                            0
                              ? `+${team.goalDifference}`
                              : team.goalDifference
                          }
                        />
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>

            {!!data?.recentResults.length && (
              <section className="rounded-3xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h2 className="text-xl ">
                    Recent Tournament Results
                  </h2>
                </div>

                <div className="divide-y">
                  {data.recentResults
                    .filter(
                      (result) =>
                        result.id
                    )
                    .slice(0, 8)
                    .map(
                      (result) => (
                        <Link
                          key={
                            result.id
                          }
                          href={`/dashboard/matches/${result.id}`}
                          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm ">
                              {
                                result.homeTeam
                              }{' '}
                              vs{' '}
                              {
                                result.awayTeam
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              {formatDate(
                                result.date
                              )}
                            </p>
                          </div>

                          <p className="shrink-0 text-lg ">
                            {
                              result.homeScore
                            }{' '}
                            –{' '}
                            {
                              result.awayScore
                            }
                          </p>
                        </Link>
                      )
                    )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-[11px]  uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p
        className="mt-2 text-3xl "
        style={{
          color: highlight
            ? 'var(--veldt-green)'
            : '#0F172A',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'right',
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-4 text-${align}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`text-xs  uppercase tracking-wider ${
          active
            ? 'text-slate-900'
            : 'text-slate-500'
        }`}
      >
        {label}{' '}
        {active
          ? direction === 'asc'
            ? '↑'
            : '↓'
          : '↕'}
      </button>
    </th>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 text-center">
      <p className="text-[10px]  uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm ">
        {value}
      </p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
      Loading tournament...
    </div>
  );
}

function formatDate(
  date: string | null
) {
  if (!date) {
    return 'Date not set';
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    'en-ZA',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}