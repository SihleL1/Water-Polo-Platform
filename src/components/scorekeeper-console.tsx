"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Match = {
  id: string;
  home_score?: number;
  away_score?: number;
  period?: number;
  home_team_name?: string;
  away_team_name?: string;
  home_cap_color?: string;
  away_cap_color?: string;
};

export default function ScorekeeperConsole({ match }: { match: Match }) {
  const [local, setLocal] = useState<Match>(match);

  useEffect(() => {
    setLocal(match);
  }, [match]);

  const updateMatch = useCallback(async (patch: Partial<Match>) => {
    setLocal((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from('matches').update(patch).eq('id', match.id);
    if (error) {
      console.error('Failed to update match', error);
    }
  }, [match.id]);

  const changeScore = (side: 'home' | 'away', delta: number) => {
    const key = side === 'home' ? 'home_score' : 'away_score';
    const curr = Number((local as any)[key] ?? 0);
    const next = Math.max(0, curr + delta);
    updateMatch({ [key]: next } as Partial<Match>);
  };

  const changePeriod = (delta: number) => {
    const curr = Number(local.period ?? 0);
    const next = Math.max(0, curr + delta);
    updateMatch({ period: next });
  };

  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-xl font-bold">Scorekeeper: {local.home_team_name} vs {local.away_team_name}</h2>
        <div className="text-sm text-muted">Caps: {local.home_cap_color} (Home) — {local.away_cap_color} (Away)</div>
      </header>

      <div className="flex gap-8 items-center">
        <div className="text-center">
          <div className="text-sm font-medium">{local.home_team_name}</div>
          <div className="text-5xl font-bold">{local.home_score ?? 0}</div>
          <div className="mt-3 flex gap-2 justify-center">
            <button onClick={() => changeScore('home', 1)} className="px-3 py-1 bg-green-600 text-white rounded">+1</button>
            <button onClick={() => changeScore('home', -1)} className="px-3 py-1 bg-red-600 text-white rounded">-1</button>
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium">{local.away_team_name}</div>
          <div className="text-5xl font-bold">{local.away_score ?? 0}</div>
          <div className="mt-3 flex gap-2 justify-center">
            <button onClick={() => changeScore('away', 1)} className="px-3 py-1 bg-green-600 text-white rounded">+1</button>
            <button onClick={() => changeScore('away', -1)} className="px-3 py-1 bg-red-600 text-white rounded">-1</button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div>Period</div>
          <button onClick={() => changePeriod(-1)} className="px-2 py-1 bg-slate-200 rounded">-</button>
          <div className="px-4">{local.period ?? 0}</div>
          <button onClick={() => changePeriod(1)} className="px-2 py-1 bg-slate-200 rounded">+</button>
        </div>
      </div>
    </div>
  );
}
