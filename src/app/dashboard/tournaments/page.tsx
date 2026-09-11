'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, Trophy } from 'lucide-react';

import Header from '@/components/Header';

type Tournament = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  created_at: string;
};

type ApiResponse = {
  tournaments?: Tournament[];
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return 'Date not set';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard/stats', {
          cache: 'no-store',
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(result.error ?? 'Failed to load tournaments.');
        }

        if (!cancelled) {
          setTournaments(result.tournaments ?? []);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tournaments.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTournaments();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedTournaments = useMemo(() => {
    return [...tournaments].sort((a, b) => {
      const aDate = a.start_date ?? a.created_at;
      const bDate = b.start_date ?? b.created_at;

      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [tournaments]);

  return (
    <div className="min-h-screen bg-[var(--bg-soft)]">
      {' '}
      <Header />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-veldt-ochre">
            <Trophy className="h-4 w-4" />
            Competition Management
          </div>

          <h1 className="text-3xl font-black tracking-tight text-veldt-green sm:text-4xl">
            Tournaments
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-veldt-muted sm:text-base">
            View tournaments, competition details and tournament performance.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-veldt-border bg-white p-8 text-center shadow-sm">
            <div className="text-sm font-semibold text-veldt-muted">Loading tournaments...</div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="font-bold text-red-800">Unable to load tournaments</div>

            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && sortedTournaments.length === 0 && (
          <div className="rounded-2xl border border-veldt-border bg-white p-10 text-center shadow-sm">
            <Trophy className="mx-auto h-10 w-10 text-veldt-ochre" />

            <h2 className="mt-4 text-xl font-bold text-veldt-green">No tournaments found</h2>

            <p className="mt-2 text-sm text-veldt-muted">
              Create a tournament from the admin area to see it here.
            </p>

            <Link
              href="/admin"
              className="mt-6 inline-flex items-center rounded-xl bg-veldt-green px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Go to Admin
            </Link>
          </div>
        )}

        {!loading && !error && sortedTournaments.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedTournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/dashboard/tournaments/${tournament.id}`}
                className="group rounded-2xl border border-veldt-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-veldt-green/10">
                    <Trophy className="h-6 w-6 text-veldt-green" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-veldt-green" />
                </div>

                <h2 className="mt-5 text-xl font-black text-veldt-green">{tournament.name}</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-veldt-muted">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {formatDate(tournament.start_date)}
                      {tournament.end_date && ` – ${formatDate(tournament.end_date)}`}
                    </span>
                  </div>

                  {tournament.location && (
                    <div className="text-sm font-medium text-slate-600">{tournament.location}</div>
                  )}
                </div>

                <div className="mt-6 border-t border-veldt-border pt-4 text-xs font-bold uppercase tracking-[0.14em] text-veldt-ochre">
                  View Tournament
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
