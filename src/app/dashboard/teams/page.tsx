'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import Header from '@/components/Header';

type Category = 'BOYS' | 'GIRLS';

type ApiTeam = {
  id: string;
  name?: string | null;
  city?: string | null;
  province?: string | null;

  played?: number | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;

  goalsFor?: number | null;
  goalsAgainst?: number | null;
  goalDiff?: number | null;
  points?: number | null;

  totalShots?: number | null;
  shotsOnTarget?: number | null;
  shotsOffTarget?: number | null;

  saves?: number | null;
  steals?: number | null;
  turnovers?: number | null;
  blocks?: number | null;

  exclusionsDrawn?: number | null;
  exclusionsCommitted?: number | null;

  penaltiesTaken?: number | null;
  penaltiesScored?: number | null;
  penaltiesMissed?: number | null;

  sprintsWon?: number | null;
  sprintsLost?: number | null;
  sprintAttempts?: number | null;
  sprintWinPercentage?: number | null;

  assists?: number | null;
};

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
  savesPerGame: number;
  stealsPerGame: number;
  goalPercentage: number;
};

type ApiResponse = {
  data?: ApiTeam[];
  error?: string;
};

function numberOrZero(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function calculateWinPercentage(wins: number, played: number) {
  return played > 0 ? (wins / played) * 100 : 0;
}

function calculateStreak(wins: number, losses: number, draws: number) {
  if (wins === 0 && losses === 0 && draws === 0) {
    return 'No games';
  }

  if (wins > 0 && losses === 0 && draws === 0) {
    return `${wins}W`;
  }

  if (losses > 0 && wins === 0 && draws === 0) {
    return `${losses}L`;
  }

  if (draws > 0 && wins === 0 && losses === 0) {
    return `${draws}D`;
  }

  return `${wins}W`;
}

function normaliseTeam(team: ApiTeam): Team {
  const gamesPlayed = numberOrZero(team.played);

  const gamesWon = numberOrZero(team.wins);

  const gamesLost = numberOrZero(team.losses);

  const gamesDrawn = numberOrZero(team.draws);

  const goalsFor = numberOrZero(team.goalsFor);

  const goalsAgainst = numberOrZero(team.goalsAgainst);

  const goalDifference =
    typeof team.goalDiff === 'number' && Number.isFinite(team.goalDiff)
      ? team.goalDiff
      : goalsFor - goalsAgainst;

  const assists = numberOrZero(team.assists);

  const saves = numberOrZero(team.saves);

  const steals = numberOrZero(team.steals);

  const shotsOnTarget = numberOrZero(team.shotsOnTarget);

  const winPercentage = calculateWinPercentage(gamesWon, gamesPlayed);

  const goalsPerGame = gamesPlayed > 0 ? goalsFor / gamesPlayed : 0;

  const assistsPerGame = gamesPlayed > 0 ? assists / gamesPlayed : 0;

  const savesPerGame = gamesPlayed > 0 ? saves / gamesPlayed : 0;

  const stealsPerGame = gamesPlayed > 0 ? steals / gamesPlayed : 0;

  const goalPercentage = shotsOnTarget > 0 ? (goalsFor / shotsOnTarget) * 100 : 0;

  return {
    id: team.id,
    name: team.name?.trim() || 'Unnamed Team',
    province: team.province?.trim() || '',

    gamesPlayed,
    gamesWon,
    gamesLost,
    gamesDrawn,

    winPercentage,
    streak: calculateStreak(gamesWon, gamesLost, gamesDrawn),

    goalsFor,
    goalsAgainst,
    goalDifference,

    goalsPerGame,
    assistsPerGame,
    savesPerGame,
    stealsPerGame,
    goalPercentage,
  };
}

export default function PublicTeamsPage() {
  const [category, setCategory] = useState<Category>('GIRLS');

  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        params.set('category', category);

        params.set('scope', 'TEAM');

        const response = await fetch(`/api/dashboard/stats?${params.toString()}`, {
          cache: 'no-store',
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(result.error ?? 'Failed to load teams.');
        }

        const normalisedTeams = (result.data ?? [])
          .map(normaliseTeam)
          .sort((a, b) => a.name.localeCompare(b.name));

        setTeams(normalisedTeams);
      } catch (err) {
        console.error(err);

        setError(err instanceof Error ? err.message : 'Failed to load teams.');
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [category]);

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg-soft)',
        color: '#0F172A',
      }}
    >
      {' '}
      <Header />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <Link
            href="/dashboard"
            className="text-xs uppercase tracking-[0.2em]"
            style={{
              color: 'var(--veldt-ochre)',
            }}
          >
            ← Water Polo Stats
          </Link>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Schools
              </p>

              <h1
                className="mt-1 text-3xl md:text-5xl"
                style={{
                  color: 'var(--veldt-green)',
                }}
              >
                Teams
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Browse schools and open their complete statistical profiles.
              </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setCategory('BOYS')}
                className={`rounded-lg px-5 py-2.5 text-sm ${
                  category === 'BOYS' ? 'text-white' : 'text-slate-500'
                }`}
                style={
                  category === 'BOYS'
                    ? {
                        background: 'var(--veldt-green)',
                      }
                    : undefined
                }
              >
                Boys
              </button>

              <button
                type="button"
                onClick={() => setCategory('GIRLS')}
                className={`rounded-lg px-5 py-2.5 text-sm ${
                  category === 'GIRLS' ? 'text-black' : 'text-slate-500'
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
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">
              Search schools
            </span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by school name..."
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{
                borderColor: 'var(--muted-slate)',
              }}
            />
          </label>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </section>
        )}

        {loading ? (
          <Loading />
        ) : !filteredTeams.length ? (
          <section className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black">No teams found</h2>

            <p className="mt-2 text-sm text-slate-500">
              There are no {category.toLowerCase()} teams matching your search.
            </p>
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p
                  className="text-xs uppercase tracking-[0.2em]"
                  style={{
                    color: 'var(--veldt-ochre)',
                  }}
                >
                  {category === 'BOYS' ? "Boys'" : "Girls'"} Competition
                </p>

                <h2 className="mt-1 text-2xl">All Teams</h2>
              </div>

              <p className="text-sm text-slate-400">{filteredTeams.length} schools</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={`/dashboard/teams/${team.id}`}
      className="group block rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      {' '}
      <div className="flex items-start justify-between gap-4">
        {' '}
        <div className="min-w-0">
          <h3
            className="text-xl group-hover:underline"
            style={{
              color: 'var(--veldt-green)',
            }}
          >
            {team.name}{' '}
          </h3>

          <p className="mt-1 text-sm text-slate-400">{team.province || 'Province not set'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs">
          {team.streak}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        <MiniStat label="GP" value={team.gamesPlayed} />

        <MiniStat label="W" value={team.gamesWon} />

        <MiniStat label="Win %" value={`${team.winPercentage.toFixed(1)}%`} />

        <MiniStat
          label="GD"
          value={team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="GPG" value={team.goalsPerGame.toFixed(1)} />

        <MiniStat label="APG" value={team.assistsPerGame.toFixed(1)} />

        <MiniStat label="SPG" value={team.savesPerGame.toFixed(1)} />
      </div>
      <p
        className="mt-5 text-sm"
        style={{
          color: 'var(--veldt-ochre)',
        }}
      >
        View team profile →
      </p>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 text-center">
      {' '}
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label} </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function Loading() {
  return (
    <section className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
      Loading teams...{' '}
    </section>
  );
}
