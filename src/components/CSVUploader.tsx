"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  home_team_name: string;
  away_team_name: string;
  pool_group_name?: string;
  home_cap_color?: string;
  away_cap_color?: string;
  scheduled_time?: string;
};

export default function CSVUploader({ tournamentId }: { tournamentId?: string }) {
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const downloadTemplate = () => {
    const headers = 'home_team_name,away_team_name,pool_group_name,home_cap_color,away_cap_color,scheduled_time\n';
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fixtures-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    setErrors([]);
    setRunning(true);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      step: async (results, parser) => {
        const row = results.data as Row;
        try {
          // resolve or create teams
          const ensureTeam = async (name?: string) => {
            if (!name) return null;
            const { data } = await supabase.from('teams').select('*').eq('name', name).maybeSingle();
            if (data) return data.id;
            const { data: ins } = await supabase.from('teams').insert([{ name, tournament_id: tournamentId || null }]).select().single();
            return ins?.id ?? null;
          };

          const homeId = await ensureTeam(row.home_team_name);
          const awayId = await ensureTeam(row.away_team_name);

          // resolve pool group
          let poolId = null;
          if (row.pool_group_name) {
            const { data } = await supabase.from('pool_groups').select('*').eq('name', row.pool_group_name).maybeSingle();
            if (data) poolId = data.id;
            else {
              const { data: ins } = await supabase.from('pool_groups').insert([{ name: row.pool_group_name, tournament_id: tournamentId || null }]).select().single();
              poolId = ins?.id ?? null;
            }
          }

          await supabase.from('matches').insert([
            {
              tournament_id: tournamentId || null,
              pool_group_id: poolId,
              home_team_id: homeId,
              away_team_id: awayId,
              home_cap_color: row.home_cap_color || 'white',
              away_cap_color: row.away_cap_color || 'blue',
              scheduled_time: row.scheduled_time || null,
              status: 'scheduled',
            },
          ]);
        } catch (e: any) {
          setErrors((p) => [...p, e.message || String(e)]);
        }
      },
      complete: () => {
        setRunning(false);
        setProgress(100);
      },
      error: (err) => {
        setErrors((p) => [...p, err.message]);
        setRunning(false);
      },
      chunk: (results) => {
        // update progress roughly
        setProgress((p) => Math.min(99, p + 1));
      },
    });
  };

  return (
    <div className="p-4 bg-white rounded border" style={{ borderColor: '#E2E8F0' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-sm" style={{ color: '#234723' }}>Bulk Fixture Uploader</div>
        <div>
          <button onClick={downloadTemplate} className="px-3 py-1 bg-[#D8913B] text-white rounded">Download Template</button>
        </div>
      </div>

      <input type="file" accept="text/csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} disabled={running} />

      {running && (
        <div className="mt-3">
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div className="h-2 bg-[#D8913B]" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">Processing... {progress}%</div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 text-xs text-red-600">
          <div className="font-semibold">Errors</div>
          <ul className="list-disc ml-5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
