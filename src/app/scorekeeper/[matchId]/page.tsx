'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ScorekeeperConsole from '@/components/scorekeeper-console';
import Header from '@/components/Header';

type TeamSummary = { name?: string } | { name?: string }[] | null | undefined;

export default function ScorekeeperPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          id, home_score, away_score, period, home_cap_color, away_cap_color, home_team_id, away_team_id,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `
        )
        .eq('id', matchId)
        .single();

      if (error) {
        console.error(error);
      }

      if (data) {
        const getTeamName = (team: TeamSummary) => {
          if (!team) return null;
          if (Array.isArray(team)) return team[0]?.name ?? null;
          return team.name ?? null;
        };

        setMatch({
          ...data,
          home_team_name: getTeamName(data.home_team as TeamSummary),
          away_team_name: getTeamName(data.away_team as TeamSummary),
        });
      }
    };

    if (matchId) {
      fetchMatch();

      channel = supabase
        .channel(`public:matches:match:${String(matchId)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          (payload: { new?: Record<string, any>; old?: Record<string, any> }) => {
            const newRow = payload.new ?? payload.old ?? payload;
            if (newRow) {
              setMatch((prev: any) => ({ ...(prev || {}), ...newRow }));
            }
          }
        )
        .subscribe();
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [matchId]);

  if (!match) return <div style={{ padding: 24 }}>Loading match data...</div>;

  return (
    <div style={{ background: 'var(--bg-soft)' }} className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto p-6">
        <ScorekeeperConsole match={match} />
      </main>
    </div>
  );
}
