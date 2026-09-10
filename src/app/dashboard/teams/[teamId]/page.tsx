'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

type RawTeamProfile = {
  team?: {
    id?: string;
    name?: string;
    city?: string | null;
    province?: string | null;
  };

  category?: 'BOYS' | 'GIRLS' | 'MIXED' | null;
  season?: string | null;

  record?: {
    gamesPlayed?: number | null;
    gamesWon?: number | null;
    gamesLost?: number | null;
    gamesDrawn?: number | null;
    winPercentage?: number | null;
    streak?: string | null;
    goalsFor?: number | null;
    goalsAgainst?: number | null;
    goalDifference?: number | null;
  };

  traditional?: {
    goals?: number | null;
    goalsPerGame?: number | null;

    assists?: number | null;
    assistsPerGame?: number | null;

    offensiveRebounds?: number | null;
    offensiveReboundsPerGame?: number | null;

    defensiveRebounds?: number | null;
    defensiveReboundsPerGame?: number | null;

    saves?: number | null;
    savesPerGame?: number | null;

    blocks?: number | null;
    blocksPerGame?: number | null;

    steals?: number | null;
    stealsPerGame?: number | null;

    turnovers?: number | null;
    turnoversPerGame?: number | null;

    exclusions?: number | null;
    exclusionsPerGame?: number | null;

    shotsOnTarget?: number | null;
    shotsOffTarget?: number | null;
    totalShots?: number | null;

    goalPercentage?: number | null;

    fiveMeterPenaltyTaken?: number | null;
    fiveMeterPenaltyScored?: number | null;
    fiveMeterPenaltyPercentage?: number | null;
  };

  advanced?: {
    offensiveEfficiency?: number | null;
    defensiveEfficiency?: number | null;
    netEfficiency?: number | null;

    sprintWins?: number | null;
    sprintAttempts?: number | null;
    sprintWinPercentage?: number | null;
  };

  tournaments?: {
    id: string;
    name: string;
    gamesPlayed?: number | null;
    gamesWon?: number | null;
    gamesLost?: number | null;
    gamesDrawn?: number | null;
    winPercentage?: number | null;
    goalsFor?: number | null;
    goalsAgainst?: number | null;
    goalDifference?: number | null;
  }[];

  pools?: {
    id: string;
    name: string;
    gamesPlayed?: number | null;
    gamesWon?: number | null;
    gamesLost?: number | null;
    gamesDrawn?: number | null;
    winPercentage?: number | null;
    goalsFor?: number | null;
    goalsAgainst?: number | null;
    goalDifference?: number | null;
  }[];

  games?: {
    id: string;
    date?: string | null;
    tournamentName?: string | null;
    poolName?: string | null;
    opponent?: string | null;
    homeAway?: 'HOME' | 'AWAY';
    teamScore?: number | null;
    opponentScore?: number | null;
    result?: 'W' | 'L' | 'D';
  }[];
};

type TeamProfile = {
  team: {
    id: string;
    name: string;
    city: string;
    province: string;
  };

  category: 'BOYS' | 'GIRLS' | 'MIXED';
  season: string | null;

  record: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDrawn: number;
    winPercentage: number;
    streak: string;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  };

  traditional: {
    goals: number;
    goalsPerGame: number;

    assists: number;
    assistsPerGame: number;

    offensiveRebounds: number;
    offensiveReboundsPerGame: number;

    defensiveRebounds: number;
    defensiveReboundsPerGame: number;

    saves: number;
    savesPerGame: number;

    blocks: number;
    blocksPerGame: number;

    steals: number;
    stealsPerGame: number;

    turnovers: number;
    turnoversPerGame: number;

    exclusions: number;
    exclusionsPerGame: number;

    shotsOnTarget: number;
    shotsOffTarget: number;
    totalShots: number;

    goalPercentage: number;

    fiveMeterPenaltyTaken: number;
    fiveMeterPenaltyScored: number;
    fiveMeterPenaltyPercentage: number;
  };

  advanced: {
    offensiveEfficiency: number | null;
    defensiveEfficiency: number | null;
    netEfficiency: number | null;

    sprintWins: number;
    sprintAttempts: number;
    sprintWinPercentage: number | null;
  };

  tournaments: {
    id: string;
    name: string;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDrawn: number;
    winPercentage: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }[];

  pools: {
    id: string;
    name: string;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDrawn: number;
    winPercentage: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }[];

  games: {
    id: string;
    date: string | null;
    tournamentName: string;
    poolName: string | null;
    opponent: string;
    homeAway: 'HOME' | 'AWAY';
    teamScore: number;
    opponentScore: number;
    result: 'W' | 'L' | 'D';
  }[];
};

type ApiResponse = {
  data?: RawTeamProfile;
  error?: string;
};

type ActiveTab =
  | 'OVERVIEW'
  | 'TRADITIONAL'
  | 'ADVANCED'
  | 'TOURNAMENTS'
  | 'POOLS'
  | 'GAMES';

function numberOrZero(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(
  value: unknown
): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function divide(
  numerator: number,
  denominator: number
): number {
  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}

function percentage(
  numerator: number,
  denominator: number
): number {
  if (!denominator) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function normalizeProfile(
  raw: RawTeamProfile
): TeamProfile {
  const rawTeam = raw.team ?? {};

  const teamId =
    rawTeam.id ?? '';

  const teamName =
    rawTeam.name ?? 'Unknown Team';

  const teamCity =
    rawTeam.city ?? '';

  const teamProvince =
    rawTeam.province ?? '';

  const record = raw.record ?? {};
  const traditional =
    raw.traditional ?? {};
  const advanced =
    raw.advanced ?? {};

  const gamesPlayed =
    numberOrZero(
      record.gamesPlayed
    );

  const gamesWon =
    numberOrZero(
      record.gamesWon
    );

  const gamesLost =
    numberOrZero(
      record.gamesLost
    );

  const gamesDrawn =
    numberOrZero(
      record.gamesDrawn
    );

  const goalsFor =
    numberOrZero(
      record.goalsFor
    );

  const goalsAgainst =
    numberOrZero(
      record.goalsAgainst
    );

  const goalDifference =
    Number.isFinite(
      Number(record.goalDifference)
    )
      ? numberOrZero(
          record.goalDifference
        )
      : goalsFor -
        goalsAgainst;

  const calculatedWinPercentage =
    percentage(
      gamesWon,
      gamesPlayed
    );

  const winPercentage =
    nullableNumber(
      record.winPercentage
    ) ??
    calculatedWinPercentage;

  const goals =
    numberOrZero(
      traditional.goals
    );

  const assists =
    numberOrZero(
      traditional.assists
    );

  const offensiveRebounds =
    numberOrZero(
      traditional.offensiveRebounds
    );

  const defensiveRebounds =
    numberOrZero(
      traditional.defensiveRebounds
    );

  const saves =
    numberOrZero(
      traditional.saves
    );

  const blocks =
    numberOrZero(
      traditional.blocks
    );

  const steals =
    numberOrZero(
      traditional.steals
    );

  const turnovers =
    numberOrZero(
      traditional.turnovers
    );

  const exclusions =
    numberOrZero(
      traditional.exclusions
    );

  const shotsOnTarget =
    numberOrZero(
      traditional.shotsOnTarget
    );

  const shotsOffTarget =
    numberOrZero(
      traditional.shotsOffTarget
    );

  const totalShots =
    numberOrZero(
      traditional.totalShots
    );

  const goalPercentage =
    nullableNumber(
      traditional.goalPercentage
    ) ??
    percentage(
      goals,
      totalShots
    );

  const penaltyTaken =
    numberOrZero(
      traditional.fiveMeterPenaltyTaken
    );

  const penaltyScored =
    numberOrZero(
      traditional.fiveMeterPenaltyScored
    );

  const penaltyPercentage =
    nullableNumber(
      traditional.fiveMeterPenaltyPercentage
    ) ??
    percentage(
      penaltyScored,
      penaltyTaken
    );

  const sprintWins =
    numberOrZero(
      advanced.sprintWins
    );

  const sprintAttempts =
    numberOrZero(
      advanced.sprintAttempts
    );

  const sprintWinPercentage =
    nullableNumber(
      advanced.sprintWinPercentage
    ) ??
    percentage(
      sprintWins,
      sprintAttempts
    );

  const rawStreak =
    record.streak?.trim();

  const streak =
    rawStreak ||
    (gamesPlayed
      ? `${gamesWon}W ${gamesLost}L${
          gamesDrawn
            ? ` ${gamesDrawn}D`
            : ''
        }`
      : '—');

  return {
    team: {
      id: teamId,
      name: teamName,
      city: teamCity,
      province: teamProvince,
    },

    category:
      raw.category === 'BOYS' ||
      raw.category === 'GIRLS' ||
      raw.category === 'MIXED'
        ? raw.category
        : 'GIRLS',

    season:
      raw.season ?? null,

    record: {
      gamesPlayed,
      gamesWon,
      gamesLost,
      gamesDrawn,
      winPercentage,
      streak,
      goalsFor,
      goalsAgainst,
      goalDifference,
    },

    traditional: {
      goals,
      goalsPerGame:
        nullableNumber(
          traditional.goalsPerGame
        ) ??
        divide(
          goals,
          gamesPlayed
        ),

      assists,
      assistsPerGame:
        nullableNumber(
          traditional.assistsPerGame
        ) ??
        divide(
          assists,
          gamesPlayed
        ),

      offensiveRebounds,
      offensiveReboundsPerGame:
        nullableNumber(
          traditional.offensiveReboundsPerGame
        ) ??
        divide(
          offensiveRebounds,
          gamesPlayed
        ),

      defensiveRebounds,
      defensiveReboundsPerGame:
        nullableNumber(
          traditional.defensiveReboundsPerGame
        ) ??
        divide(
          defensiveRebounds,
          gamesPlayed
        ),

      saves,
      savesPerGame:
        nullableNumber(
          traditional.savesPerGame
        ) ??
        divide(
          saves,
          gamesPlayed
        ),

      blocks,
      blocksPerGame:
        nullableNumber(
          traditional.blocksPerGame
        ) ??
        divide(
          blocks,
          gamesPlayed
        ),

      steals,
      stealsPerGame:
        nullableNumber(
          traditional.stealsPerGame
        ) ??
        divide(
          steals,
          gamesPlayed
        ),

      turnovers,
      turnoversPerGame:
        nullableNumber(
          traditional.turnoversPerGame
        ) ??
        divide(
          turnovers,
          gamesPlayed
        ),

      exclusions,
      exclusionsPerGame:
        nullableNumber(
          traditional.exclusionsPerGame
        ) ??
        divide(
          exclusions,
          gamesPlayed
        ),

      shotsOnTarget,
      shotsOffTarget,
      totalShots,

      goalPercentage,

      fiveMeterPenaltyTaken:
        penaltyTaken,

      fiveMeterPenaltyScored:
        penaltyScored,

      fiveMeterPenaltyPercentage:
        penaltyPercentage,
    },

    advanced: {
      offensiveEfficiency:
        nullableNumber(
          advanced.offensiveEfficiency
        ),

      defensiveEfficiency:
        nullableNumber(
          advanced.defensiveEfficiency
        ),

      netEfficiency:
        nullableNumber(
          advanced.netEfficiency
        ),

      sprintWins,
      sprintAttempts,
      sprintWinPercentage,
    },

    tournaments:
      (raw.tournaments ?? []).map(
        (item) => {
          const itemGamesPlayed =
            numberOrZero(
              item.gamesPlayed
            );

          const itemGamesWon =
            numberOrZero(
              item.gamesWon
            );

          const itemGoalsFor =
            numberOrZero(
              item.goalsFor
            );

          const itemGoalsAgainst =
            numberOrZero(
              item.goalsAgainst
            );

          return {
            id: item.id,
            name:
              item.name ??
              'Tournament',

            gamesPlayed:
              itemGamesPlayed,

            gamesWon:
              itemGamesWon,

            gamesLost:
              numberOrZero(
                item.gamesLost
              ),

            gamesDrawn:
              numberOrZero(
                item.gamesDrawn
              ),

            winPercentage:
              nullableNumber(
                item.winPercentage
              ) ??
              percentage(
                itemGamesWon,
                itemGamesPlayed
              ),

            goalsFor:
              itemGoalsFor,

            goalsAgainst:
              itemGoalsAgainst,

            goalDifference:
              Number.isFinite(
                Number(
                  item.goalDifference
                )
              )
                ? numberOrZero(
                    item.goalDifference
                  )
                : itemGoalsFor -
                  itemGoalsAgainst,
          };
        }
      ),

    pools:
      (raw.pools ?? []).map(
        (item) => {
          const itemGamesPlayed =
            numberOrZero(
              item.gamesPlayed
            );

          const itemGamesWon =
            numberOrZero(
              item.gamesWon
            );

          const itemGoalsFor =
            numberOrZero(
              item.goalsFor
            );

          const itemGoalsAgainst =
            numberOrZero(
              item.goalsAgainst
            );

          return {
            id: item.id,
            name:
              item.name ??
              'Pool',

            gamesPlayed:
              itemGamesPlayed,

            gamesWon:
              itemGamesWon,

            gamesLost:
              numberOrZero(
                item.gamesLost
              ),

            gamesDrawn:
              numberOrZero(
                item.gamesDrawn
              ),

            winPercentage:
              nullableNumber(
                item.winPercentage
              ) ??
              percentage(
                itemGamesWon,
                itemGamesPlayed
              ),

            goalsFor:
              itemGoalsFor,

            goalsAgainst:
              itemGoalsAgainst,

            goalDifference:
              Number.isFinite(
                Number(
                  item.goalDifference
                )
              )
                ? numberOrZero(
                    item.goalDifference
                  )
                : itemGoalsFor -
                  itemGoalsAgainst,
          };
        }
      ),

    games:
      (raw.games ?? []).map(
        (game) => ({
          id: game.id,

          date:
            game.date ?? null,

          tournamentName:
            game.tournamentName ??
            'Tournament',

          poolName:
            game.poolName ??
            null,

          opponent:
            game.opponent ??
            'TBD',

          homeAway:
            game.homeAway === 'AWAY'
              ? 'AWAY'
              : 'HOME',

          teamScore:
            numberOrZero(
              game.teamScore
            ),

          opponentScore:
            numberOrZero(
              game.opponentScore
            ),

          result:
            game.result === 'W' ||
            game.result === 'L' ||
            game.result === 'D'
              ? game.result
              : 'D',
        })
      ),
  };
}

export default function TeamDashboardPage() {
  const params =
    useParams<{
      teamId: string;
    }>();

  const teamId =
    typeof params?.teamId ===
    'string'
      ? params.teamId
      : '';

  const [profile, setProfile] =
    useState<TeamProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [activeTab, setActiveTab] =
    useState<ActiveTab>(
      'OVERVIEW'
    );

  useEffect(() => {
    let cancelled = false;

    async function loadTeam() {
      if (!teamId) {
        setError(
          'No team ID was provided.'
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            `/api/dashboard/teams/${teamId}`,
            {
              cache: 'no-store',
            }
          );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              'Failed to load team profile.'
          );
        }

        if (!result.data) {
          throw new Error(
            'Team profile was not returned.'
          );
        }

        if (!cancelled) {
          setProfile(
            normalizeProfile(
              result.data
            )
          );
        }
      } catch (err) {
        console.error(
          'Team profile error:',
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load team profile.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const formatNumber = (
    value: number | null
  ) => {
    if (
      value === null ||
      !Number.isFinite(value)
    ) {
      return '—';
    }

    return value.toFixed(1);
  };

  const formatPct = (
    value: number | null
  ) => {
    if (
      value === null ||
      !Number.isFinite(value)
    ) {
      return '—';
    }

    return `${value.toFixed(1)}%`;
  };

  const resultClass = (
    result: 'W' | 'L' | 'D'
  ) => {
    if (result === 'W') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (result === 'L') {
      return 'bg-red-100 text-red-700';
    }

    return 'bg-amber-100 text-amber-700';
  };

  const headerSubtext =
    useMemo(() => {
      if (!profile) {
        return '';
      }

      const location = [
        profile.team.city,
        profile.team.province,
      ]
        .filter(Boolean)
        .join(', ');

      const category =
        profile.category ===
        'BOYS'
          ? "Boys' competition"
          : profile.category ===
            'GIRLS'
            ? "Girls' competition"
            : 'Mixed competition';

      return [
        location,
        category,
        profile.season ??
          'All completed matches',
      ]
        .filter(Boolean)
        .join(' • ');
    }, [profile]);

  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{
          background:
            'var(--bg-soft)',
        }}
      >
        <Header />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading team statistics...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div
        className="min-h-screen"
        style={{
          background:
            'var(--bg-soft)',
        }}
      >
        <Header />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            >
              Team Statistics
            </p>

            <h1
              className="mt-2 text-3xl font-black"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              Unable to load team
            </h1>

            <p className="mt-3 text-sm text-red-600">
              {error ??
                'Team not found.'}
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-xl px-4 py-3 text-sm font-black text-white"
              style={{
                background:
                  'var(--veldt-green)',
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const {
    team,
    record,
    traditional,
    advanced,
  } = profile;

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'var(--bg-soft)',
        color: '#0F172A',
      }}
    >
      <Header />

      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    'var(--veldt-ochre)',
                }}
              >
                ← Water Polo Stats
              </Link>

              <h1
                className="mt-2 text-3xl font-black md:text-5xl"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                {team.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {headerSubtext}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Current Record
              </p>

              <p className="mt-1 text-2xl font-black">
                {record.gamesWon}-
                {record.gamesLost}
                {record.gamesDrawn
                  ? `-${record.gamesDrawn}`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        {/* HERO STATS */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Games Played"
            value={String(
              record.gamesPlayed
            )}
          />

          <StatCard
            label="Win Percentage"
            value={formatPct(
              record.winPercentage
            )}
            highlight
          />

          <StatCard
            label="Goal Difference"
            value={
              record.goalDifference >
              0
                ? `+${record.goalDifference}`
                : String(
                    record.goalDifference
                  )
            }
          />

          <StatCard
            label="Current Streak"
            value={
              record.streak ||
              '—'
            }
          />
        </section>

        {/* TABS */}

        <section className="overflow-x-auto rounded-2xl border bg-white p-1 shadow-sm">
          <div className="flex min-w-max gap-1">
            {[
              [
                'OVERVIEW',
                'Overview',
              ],
              [
                'TRADITIONAL',
                'Traditional',
              ],
              [
                'ADVANCED',
                'Advanced',
              ],
              [
                'TOURNAMENTS',
                'Tournaments',
              ],
              [
                'POOLS',
                'Pool Groups',
              ],
              [
                'GAMES',
                'Game Log',
              ],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      value as ActiveTab
                    )
                  }
                  className={`rounded-xl px-4 py-3 text-xs font-black transition ${
                    activeTab === value
                      ? 'text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab ===
                    value
                      ? {
                          background:
                            'var(--veldt-green)',
                        }
                      : undefined
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </section>

        {/* OVERVIEW */}

        {activeTab ===
          'OVERVIEW' && (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <StatSection title="Record">
                <MetricRow
                  label="Games Played"
                  value={
                    record.gamesPlayed
                  }
                />

                <MetricRow
                  label="Games Won"
                  value={
                    record.gamesWon
                  }
                />

                <MetricRow
                  label="Games Lost"
                  value={
                    record.gamesLost
                  }
                />

                <MetricRow
                  label="Games Drawn"
                  value={
                    record.gamesDrawn
                  }
                />

                <MetricRow
                  label="Win Percentage"
                  value={formatPct(
                    record.winPercentage
                  )}
                />

                <MetricRow
                  label="Goals For"
                  value={
                    record.goalsFor
                  }
                />

                <MetricRow
                  label="Goals Against"
                  value={
                    record.goalsAgainst
                  }
                />

                <MetricRow
                  label="Goal Difference"
                  value={
                    record.goalDifference >
                    0
                      ? `+${record.goalDifference}`
                      : record.goalDifference
                  }
                />

                <MetricRow
                  label="Streak"
                  value={
                    record.streak
                  }
                />
              </StatSection>

              <StatSection title="Key Performance">
                <MetricRow
                  label="Goals / Game"
                  value={formatNumber(
                    traditional.goalsPerGame
                  )}
                />

                <MetricRow
                  label="Assists / Game"
                  value={formatNumber(
                    traditional.assistsPerGame
                  )}
                />

                <MetricRow
                  label="Saves / Game"
                  value={formatNumber(
                    traditional.savesPerGame
                  )}
                />

                <MetricRow
                  label="Steals / Game"
                  value={formatNumber(
                    traditional.stealsPerGame
                  )}
                />

                <MetricRow
                  label="Turnovers / Game"
                  value={formatNumber(
                    traditional.turnoversPerGame
                  )}
                />

                <MetricRow
                  label="Goal Percentage"
                  value={formatPct(
                    traditional.goalPercentage
                  )}
                />

                <MetricRow
                  label="5M Penalty Percentage"
                  value={formatPct(
                    traditional.fiveMeterPenaltyPercentage
                  )}
                />
              </StatSection>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <StatSection title="Offence">
                <MetricRow
                  label="Goals / Game"
                  value={formatNumber(
                    traditional.goalsPerGame
                  )}
                />

                <MetricRow
                  label="Assists / Game"
                  value={formatNumber(
                    traditional.assistsPerGame
                  )}
                />

                <MetricRow
                  label="Goal Percentage"
                  value={formatPct(
                    traditional.goalPercentage
                  )}
                />

                <MetricRow
                  label="Offensive Efficiency"
                  value={formatNumber(
                    advanced.offensiveEfficiency
                  )}
                />
              </StatSection>

              <StatSection title="Defence">
                <MetricRow
                  label="Saves / Game"
                  value={formatNumber(
                    traditional.savesPerGame
                  )}
                />

                <MetricRow
                  label="Blocks / Game"
                  value={formatNumber(
                    traditional.blocksPerGame
                  )}
                />

                <MetricRow
                  label="Steals / Game"
                  value={formatNumber(
                    traditional.stealsPerGame
                  )}
                />

                <MetricRow
                  label="Defensive Efficiency"
                  value={formatNumber(
                    advanced.defensiveEfficiency
                  )}
                />
              </StatSection>
            </section>
          </>
        )}

        {/* TRADITIONAL */}

        {activeTab ===
          'TRADITIONAL' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <StatSection title="Scoring">
              <MetricRow
                label="Goals"
                value={
                  traditional.goals
                }
              />

              <MetricRow
                label="Goals / Game"
                value={formatNumber(
                  traditional.goalsPerGame
                )}
              />

              <MetricRow
                label="Shots on Target"
                value={
                  traditional.shotsOnTarget
                }
              />

              <MetricRow
                label="Shots off Target"
                value={
                  traditional.shotsOffTarget
                }
              />

              <MetricRow
                label="Total Shots"
                value={
                  traditional.totalShots
                }
              />

              <MetricRow
                label="Goal Percentage"
                value={formatPct(
                  traditional.goalPercentage
                )}
              />

              <MetricRow
                label="5M Penalties Taken"
                value={
                  traditional.fiveMeterPenaltyTaken
                }
              />

              <MetricRow
                label="5M Penalties Scored"
                value={
                  traditional.fiveMeterPenaltyScored
                }
              />

              <MetricRow
                label="5M Penalty Percentage"
                value={formatPct(
                  traditional.fiveMeterPenaltyPercentage
                )}
              />
            </StatSection>

            <StatSection title="Playmaking & Possession">
              <MetricRow
                label="Assists"
                value={
                  traditional.assists
                }
              />

              <MetricRow
                label="Assists / Game"
                value={formatNumber(
                  traditional.assistsPerGame
                )}
              />

              <MetricRow
                label="Offensive Rebounds"
                value={
                  traditional.offensiveRebounds
                }
              />

              <MetricRow
                label="Offensive Rebounds / Game"
                value={formatNumber(
                  traditional.offensiveReboundsPerGame
                )}
              />

              <MetricRow
                label="Defensive Rebounds"
                value={
                  traditional.defensiveRebounds
                }
              />

              <MetricRow
                label="Defensive Rebounds / Game"
                value={formatNumber(
                  traditional.defensiveReboundsPerGame
                )}
              />

              <MetricRow
                label="Turnovers"
                value={
                  traditional.turnovers
                }
              />

              <MetricRow
                label="Turnovers / Game"
                value={formatNumber(
                  traditional.turnoversPerGame
                )}
              />
            </StatSection>

            <StatSection title="Defence">
              <MetricRow
                label="Saves"
                value={
                  traditional.saves
                }
              />

              <MetricRow
                label="Saves / Game"
                value={formatNumber(
                  traditional.savesPerGame
                )}
              />

              <MetricRow
                label="Blocks"
                value={
                  traditional.blocks
                }
              />

              <MetricRow
                label="Blocks / Game"
                value={formatNumber(
                  traditional.blocksPerGame
                )}
              />

              <MetricRow
                label="Steals"
                value={
                  traditional.steals
                }
              />

              <MetricRow
                label="Steals / Game"
                value={formatNumber(
                  traditional.stealsPerGame
                )}
              />
            </StatSection>

            <StatSection title="Discipline">
              <MetricRow
                label="Exclusions"
                value={
                  traditional.exclusions
                }
              />

              <MetricRow
                label="Exclusions / Game"
                value={formatNumber(
                  traditional.exclusionsPerGame
                )}
              />
            </StatSection>
          </section>
        )}

        {/* ADVANCED */}

        {activeTab ===
          'ADVANCED' && (
          <section className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Offensive Efficiency"
                value={formatNumber(
                  advanced.offensiveEfficiency
                )}
              />

              <StatCard
                label="Defensive Efficiency"
                value={formatNumber(
                  advanced.defensiveEfficiency
                )}
              />

              <StatCard
                label="Net Efficiency"
                value={formatNumber(
                  advanced.netEfficiency
                )}
                highlight
              />

              <StatCard
                label="Sprint Win %"
                value={formatPct(
                  advanced.sprintWinPercentage
                )}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <StatSection title="Efficiency">
                <MetricRow
                  label="Offensive Efficiency"
                  value={formatNumber(
                    advanced.offensiveEfficiency
                  )}
                />

                <MetricRow
                  label="Defensive Efficiency"
                  value={formatNumber(
                    advanced.defensiveEfficiency
                  )}
                />

                <MetricRow
                  label="Net Efficiency"
                  value={formatNumber(
                    advanced.netEfficiency
                  )}
                />
              </StatSection>

              <StatSection title="Sprint Performance">
                <MetricRow
                  label="Sprints Won"
                  value={
                    advanced.sprintWins
                  }
                />

                <MetricRow
                  label="Sprint Attempts"
                  value={
                    advanced.sprintAttempts
                  }
                />

                <MetricRow
                  label="Sprint Win %"
                  value={formatPct(
                    advanced.sprintWinPercentage
                  )}
                />
              </StatSection>
            </section>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                Metric note
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                Efficiency metrics are shown only when the API has sufficient possession data. A dash means the required possession data is not yet available.
              </p>
            </div>
          </section>
        )}

        {/* TOURNAMENTS */}

        {activeTab ===
          'TOURNAMENTS' && (
          <StatTable
            title="Tournament Performance"
            columns={[
              'Tournament',
              'GP',
              'W',
              'L',
              'D',
              'Win %',
              'GF',
              'GA',
              'GD',
            ]}
          >
            {profile.tournaments.map(
              (tournament) => (
                <tr
                  key={
                    tournament.id
                  }
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-4 font-black">
                    {
                      tournament.name
                    }
                  </td>

                  <td className="px-4 py-4">
                    {
                      tournament.gamesPlayed
                    }
                  </td>

                  <td className="px-4 py-4">
                    {
                      tournament.gamesWon
                    }
                  </td>

                  <td className="px-4 py-4">
                    {
                      tournament.gamesLost
                    }
                  </td>

                  <td className="px-4 py-4">
                    {
                      tournament.gamesDrawn
                    }
                  </td>

                  <td className="px-4 py-4 font-bold">
                    {formatPct(
                      tournament.winPercentage
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {
                      tournament.goalsFor
                    }
                  </td>

                  <td className="px-4 py-4">
                    {
                      tournament.goalsAgainst
                    }
                  </td>

                  <td className="px-4 py-4 font-bold">
                    {
                      tournament.goalDifference
                    }
                  </td>
                </tr>
              )
            )}
          </StatTable>
        )}

        {/* POOLS */}

        {activeTab ===
          'POOLS' && (
          <StatTable
            title="Pool Group Performance"
            columns={[
              'Pool',
              'GP',
              'W',
              'L',
              'D',
              'Win %',
              'GF',
              'GA',
              'GD',
            ]}
          >
            {profile.pools.map(
              (pool) => (
                <tr
                  key={pool.id}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-4 font-black">
                    {pool.name}
                  </td>

                  <td className="px-4 py-4">
                    {
                      pool.gamesPlayed
                    }
                  </td>

                  <td className="px-4 py-4">
                    {pool.gamesWon}
                  </td>

                  <td className="px-4 py-4">
                    {pool.gamesLost}
                  </td>

                  <td className="px-4 py-4">
                    {pool.gamesDrawn}
                  </td>

                  <td className="px-4 py-4 font-bold">
                    {formatPct(
                      pool.winPercentage
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {pool.goalsFor}
                  </td>

                  <td className="px-4 py-4">
                    {
                      pool.goalsAgainst
                    }
                  </td>

                  <td className="px-4 py-4 font-bold">
                    {
                      pool.goalDifference
                    }
                  </td>
                </tr>
              )
            )}
          </StatTable>
        )}

        {/* GAME LOG */}

        {activeTab ===
          'GAMES' && (
          <StatTable
            title="Game Log"
            columns={[
              'Date',
              'Tournament',
              'Pool',
              'Matchup',
              'Score',
              'Result',
            ]}
          >
            {profile.games.map(
              (game) => (
                <tr
                  key={game.id}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-4 text-slate-500">
                    {formatDate(
                      game.date
                    )}
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {
                      game.tournamentName
                    }
                  </td>

                  <td className="px-4 py-4">
                    {
                      game.poolName ??
                      '—'
                    }
                  </td>

                  <td className="px-4 py-4 font-black">
                    {game.homeAway ===
                    'HOME'
                      ? `${team.name} vs ${game.opponent}`
                      : `${game.opponent} vs ${team.name}`}
                  </td>

                  <td className="px-4 py-4 font-black">
                    {
                      game.teamScore
                    }
                    -
                    {
                      game.opponentScore
                    }
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${resultClass(
                        game.result
                      )}`}
                    >
                      {
                        game.result
                      }
                    </span>
                  </td>
                </tr>
              )
            )}
          </StatTable>
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
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p
        className="mt-2 text-3xl font-black"
        style={{
          color:
            highlight
              ? 'var(--veldt-green)'
              : '#0F172A',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-black">
          {title}
        </h2>
      </div>

      <div>{children}</div>
    </section>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5 py-4 last:border-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-black">
        {value}
      </span>
    </div>
  );
}

function StatTable({
  title,
  columns,
  children,
}: {
  title: string;
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b px-5 py-5">
        <h2 className="text-xl font-black">
          {title}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[850px] w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              {columns.map(
                (column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500"
                  >
                    {column}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {children}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(
  value: string | null
) {
  if (!value) return '—';

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-ZA',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}
