"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ScorekeeperConsole from '@/components/scorekeeper-console';

export default function ScorekeeperPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    let channel: any;

    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, home_score, away_score, period, home_cap_color, away_cap_color, home_team_id, away_team_id,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .eq('id', matchId)
        .single();

      if (error) {
        console.error(error);
      }

      if (data) {
        const homeTeamName = (() => {
          const homeTeam = data.home_team as unknown as { name?: string }[] | { name?: string } | null | undefined;
          if (Array.isArray(homeTeam)) {
            return homeTeam[0]?.name ?? null;
          }
          return homeTeam?.name ?? null;
        })();

        const awayTeamName = (() => {
          const awayTeam = data.away_team as unknown as { name?: string }[] | { name?: string } | null | undefined;
          if (Array.isArray(awayTeam)) {
            return awayTeam[0]?.name ?? null;
          }
          return awayTeam?.name ?? null;
        })();

        setMatch({
          ...data,
          home_team_name: homeTeamName,
          away_team_name: awayTeamName,
        });
      }
    };

    if (matchId) {
      fetchMatch();

      // subscribe to realtime updates for this match
      channel = supabase
        .channel(`public:matches:match:${matchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload: any) => {
          const newRow = payload.new ?? payload.old ?? payload;
          if (newRow) {
            setMatch((prev: any) => ({ ...(prev || {}), ...newRow }));
          }
        })
        .subscribe();
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, [matchId]);

  if (!match) return <div>Loading match data...</div>;

  return <ScorekeeperConsole match={match} />;
}
