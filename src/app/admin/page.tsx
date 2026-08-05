"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Plus, Calendar, Users, Play } from 'lucide-react';
import Link from 'next/link';

type Team = { id: string; name: string };
type Player = { id: string; name: string; cap_number: number; team_id: string };
type MatchItem = {
  id: string;
  status?: string;
  scheduled_time?: string | null;
  home_cap_color?: string | null;
  away_cap_color?: string | null;
  home_team?: { name?: string };
  away_team?: { name?: string };
};

export default function AdminPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [teamName, setTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [capNo, setCapNo] = useState<number>(1);
  const [pName, setPName] = useState('');

  // Match scheduling state
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [homeCap, setHomeCap] = useState('white');
  const [awayCap, setAwayCap] = useState('blue');

  useEffect(() => { loadTeams(); loadMatches(); }, []);
  useEffect(() => { if (selectedTeam) loadPlayers(selectedTeam); else setPlayers([]); }, [selectedTeam]);

  const loadTeams = async () => {
    const { data, error } = await supabase.from('teams').select('*').order('name', { ascending: true });
    if (error) console.error(error);
    if (data) setTeams(data as Team[]);
  };

  const loadPlayers = async (teamId: string) => {
    const { data, error } = await supabase.from('players').select('*').eq('team_id', teamId).order('cap_number', { ascending: true });
    if (error) console.error(error);
    if (data) setPlayers(data as Player[]);
  };

  const loadMatches = async () => {
    const { data, error } = await supabase.from('matches').select(`
      id, status, scheduled_time, home_cap_color, away_cap_color,
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `);
    if (error) console.error(error);
    if (data) setMatches(data as MatchItem[]);
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;
    const { error } = await supabase.from('teams').insert([{ name: teamName }]);
    if (error) console.error(error);
    setTeamName('');
    loadTeams();
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !pName) return;
    const { error } = await supabase.from('players').insert([{ team_id: selectedTeam, cap_number: capNo, name: pName }]);
    if (error) console.error(error);
    setPName('');
    setCapNo((c) => c + 1);
    loadPlayers(selectedTeam);
  };

  const scheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeId || !awayId || homeId === awayId) return;
    const { error } = await supabase.from('matches').insert([{
      home_team_id: homeId,
      away_team_id: awayId,
      home_cap_color: homeCap,
      away_cap_color: awayCap,
      status: 'scheduled'
    }]);
    if (error) console.error(error);
    loadMatches();
  };

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center gap-3">
        <Trophy />
        <h1 className="text-2xl font-bold">Tournament Admin Portal</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-4 border rounded">
          <h2 className="font-semibold mb-3">1. Create Teams & Roster</h2>

          <form onSubmit={addTeam} className="flex gap-2 mb-3">
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="p-2 border rounded flex-1" />
            <button type="submit" className="px-3 py-1 bg-slate-800 text-white rounded">Add</button>
          </form>

          <div className="mb-3">
            <div className="mb-2">Select Team for Roster:</div>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <button key={t.id} onClick={() => setSelectedTeam(t.id)} className={`px-3 py-1 rounded text-xs ${selectedTeam === t.id ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-white'}`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {selectedTeam && (
            <form onSubmit={addPlayer} className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="number" value={capNo} onChange={(e) => setCapNo(Number(e.target.value))} className="w-20 p-2 border rounded" />
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Player Name" className="flex-1 p-2 border rounded" />
                <button type="submit" className="px-3 py-1 bg-amber-500">+ Player</button>
              </div>

              <div>
                <h3 className="mt-3 mb-1 font-medium">Roster</h3>
                <ul>
                  {players.map((p) => (
                    <li key={p.id} className="text-sm">#{p.cap_number} — {p.name}</li>
                  ))}
                </ul>
              </div>
            </form>
          )}
        </section>

        <section className="p-4 border rounded">
          <h2 className="font-semibold mb-3">2. Schedule Match</h2>
          <form onSubmit={scheduleMatch} className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Home Team</label>
              <select value={homeId} onChange={(e) => setHomeId(e.target.value)} className="w-full p-2 border rounded">
                <option value="">Select Home Team</option>
                {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">Away Team</label>
              <select value={awayId} onChange={(e) => setAwayId(e.target.value)} className="w-full p-2 border rounded">
                <option value="">Select Away Team</option>
                {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Home Cap Color</label>
                <select value={homeCap} onChange={(e) => setHomeCap(e.target.value)} className="w-full p-2 border rounded text-xs">
                  <option value="white">White</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Away Cap Color</label>
                <select value={awayCap} onChange={(e) => setAwayCap(e.target.value)} className="w-full p-2 border rounded text-xs">
                  <option value="blue">Blue</option>
                  <option value="white">White</option>
                </select>
              </div>
            </div>

            <div>
              <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded">Schedule Match</button>
            </div>
          </form>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Matches</h3>
            <ul>
              {matches.map((m) => (
                <li key={m.id} className="mb-2">
                  {m.home_team?.name} ({m.home_cap_color}) vs {m.away_team?.name} ({m.away_cap_color})
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
