'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';
import ScorekeeperConsole from '@/components/scorekeeper/ScorekeeperConsole';

type TeamData =
  | {
      name?: string;
    }
  | {
      name?: string;
    }[]
  | null;

type MatchData = {
  id: string;

  home_score: number | null;
  away_score: number | null;

  period: number | null;

  home_cap_color: string | null;
  away_cap_color: string | null;

  status: string | null;

  home_team_id: string;
  away_team_id: string;

  home_team: TeamData;
  away_team: TeamData;
};

type CapColor = 'blue' | 'white' | 'dark';

type MatchForConsole = {
  id: string;

  home_score: number;
  away_score: number;

  period: number;

  home_cap_color: CapColor;
  away_cap_color: CapColor;

  status: string;

  home_team_id: string;
  away_team_id: string;

  home_team_name: string;
  away_team_name: string;
};

const normalizeCapColor = (color?: string | null): CapColor => {
  const normalized = color?.trim().toLowerCase();

  if (normalized === 'blue') return 'blue';
  if (normalized === 'white') return 'white';
  if (normalized === 'dark') return 'dark';

  return 'white';
};

export default function ScorekeeperMatchPage() {
  const params = useParams();

  const matchId = params?.matchId as string;

  const [match, setMatch] = useState<MatchForConsole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const loadMatch = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
  .from('matches')
  .select(`
    id,
    home_score,
    away_score,
    period,
    home_cap_color,
    away_cap_color,
    status,
    home_team_id,
    away_team_id,
    home_team:teams!matches_home_team_id_fkey (
      name
    ),
    away_team:teams!matches_away_team_id_fkey (
      name
    )
  `)
  .eq('id', matchId)
  .single();

        if (error) {
          console.error('Error loading match:', error);
          setError(error.message);
          return;
        }

        if (!data) {
          setError('Match not found.');
          return;
        }

        const matchData = data as MatchData;

        const getTeamName = (team: TeamData) => {
          if (!team) return 'TBD';

          if (Array.isArray(team)) {
            return team[0]?.name ?? 'TBD';
          }

          return team.name ?? 'TBD';
        };

        const formattedMatch: MatchForConsole = {
          id: matchData.id,

          home_score: matchData.home_score ?? 0,
          away_score: matchData.away_score ?? 0,

          period: matchData.period ?? 1,

          home_cap_color: normalizeCapColor(matchData.home_cap_color),
          away_cap_color: normalizeCapColor(matchData.away_cap_color),

          status: matchData.status ?? 'SCHEDULED',

          home_team_id: matchData.home_team_id,
          away_team_id: matchData.away_team_id,

          home_team_name: getTeamName(matchData.home_team),
          away_team_name: getTeamName(matchData.away_team),
        };

        setMatch(formattedMatch);
      } catch (err) {
        console.error('Unexpected error loading match:', err);

        setError(err instanceof Error ? err.message : 'Failed to load match.');
      } finally {
        setLoading(false);
      }
    };

    loadMatch();

    const channel = supabase
      .channel(`scorekeeper-match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch((current) => {
            if (!current) return current;

            const updated = payload.new as Partial<MatchForConsole>;

            return {
              ...current,
              ...updated,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-soft)' }}>
        <Header />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Loading scorekeeper...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-soft)' }}>
        <Header />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="text-xl font-black" style={{ color: 'var(--veldt-green)' }}>
              Unable to load match
            </h1>

            <p className="mt-2 text-sm text-red-600">{error ?? 'Match not found.'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-soft)' }}>
      <Header />

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <ScorekeeperConsole match={match} />
      </main>
    </div>
  );
}
