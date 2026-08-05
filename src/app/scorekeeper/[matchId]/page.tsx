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
        setMatch({
          ...data,
          home_team_name: data.home_team?.name,
          away_team_name: data.away_team?.name,
        });
      }
    };

    if (matchId) {
      fetchMatch();

      // subscribe to realtime updates for this match
      channel = supabase
        .channel(`public:matches:match:${matchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
          const newRow = payload.new ?? payload.record ?? payload;
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
