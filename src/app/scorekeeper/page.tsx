'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';

type MatchSummary = {
  id: string;
  status?: string;
  scheduled_time?: string | null;
  home_team?: { name?: string }[] | { name?: string } | null;
  away_team?: { name?: string }[] | { name?: string } | null;
};

export default function ScorekeeperIndexPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          id, status, scheduled_time,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `
        )
        .order('scheduled_time', { ascending: true })
        .limit(50);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setMatches(data ?? []);
      setLoading(false);
    };

    loadMatches();
  }, []);

  const getTeamName = (team: MatchSummary['home_team'] | MatchSummary['away_team']) => {
    if (!team) return 'TBD';
    if (Array.isArray(team)) return team[0]?.name ?? 'TBD';
    return team.name ?? 'TBD';
  };

  return (
    <div style={{ background: 'var(--bg-soft)' }} className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section
          className="rounded-3xl border border-[#CBD5E1] bg-white p-6 shadow-sm"
          style={{ borderColor: 'var(--muted-slate)' }}
        >
          <h1 className="text-3xl font-black" style={{ color: 'var(--veldt-green)' }}>
            Scorekeeper Matches
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-text)' }}>
            Select an active fixture to open the pools-side scoring console.
          </p>
        </section>

        <section className="grid gap-4">
          {loading ? (
            <div
              className="rounded-2xl border border-[#CBD5E1] bg-white p-6 text-sm"
              style={{ borderColor: 'var(--muted-slate)' }}
            >
              Loading fixtures...
            </div>
          ) : matches.length === 0 ? (
            <div
              className="rounded-2xl border border-[#CBD5E1] bg-white p-6"
              style={{ borderColor: 'var(--muted-slate)' }}
            >
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                No scheduled fixtures found. Please create a match in the admin panel first.
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-flex rounded-lg bg-[#E3A355] px-4 py-2 text-sm font-semibold text-black"
              >
                Open Admin Panel
              </Link>
            </div>
          ) : (
            matches.map((match) => {
              const home = getTeamName(match.home_team);
              const away = getTeamName(match.away_team);
              return (
                <Link
                  key={match.id}
                  href={`/scorekeeper/${match.id}`}
                  className="block rounded-3xl border border-[#CBD5E1] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ borderColor: 'var(--muted-slate)' }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#0F172A' }}>
                        {home} vs {away}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                        {match.status ? match.status.toUpperCase() : 'SCHEDULED'} •{' '}
                        {match.scheduled_time ?? 'No time set'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#E3A355] px-4 py-2 text-sm font-semibold text-black">
                      Open Scorekeeper
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
