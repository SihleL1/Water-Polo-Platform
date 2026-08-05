"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Plus, Calendar, Layers, Users } from 'lucide-react';

type Tournament = { id: string; name: string };
type PoolGroup = { id: string; name: string; tournament_id: string };
type Team = { id: string; name: string; tournament_id: string; pool_group_id?: string | null };
type MatchItem = {
  id: string;
  status?: string;
  pool_group_id?: string | null;
  home_cap_color?: string | null;
  away_cap_color?: string | null;
  home_team?: { name?: string };
  away_team?: { name?: string };
};

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');

  const [pools, setPools] = useState<PoolGroup[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);

  const [tournamentName, setTournamentName] = useState('');
  const [poolName, setPoolName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPoolId, setNewTeamPoolId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamPoolUpdates, setTeamPoolUpdates] = useState<Record<string, string>>({});

  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [homeCap, setHomeCap] = useState<'white' | 'blue' | 'dark'>('white');
  const [awayCap, setAwayCap] = useState<'white' | 'blue' | 'dark'>('blue');

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadPools(selectedTournament);
      loadTeams(selectedTournament);
      loadMatches(selectedTournament);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      setTournaments(data as Tournament[]);
      if (!selectedTournament && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    }
  };

  const loadPools = async (tournamentId: string) => {
    const { data, error } = await supabase.from('pool_groups').select('*').eq('tournament_id', tournamentId).order('name', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    if (data) setPools(data as PoolGroup[]);
  };

  const loadTeams = async (tournamentId: string) => {
    const { data, error } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId).order('name', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      const teamsWithPools = (data as Team[]).map((team) => ({
        ...team,
        pool_group_id: team.pool_group_id ?? null,
      }));
      setTeams(teamsWithPools);
      setTeamPoolUpdates(
        teamsWithPools.reduce((acc, team) => {
          if (team.pool_group_id) acc[team.id] = team.pool_group_id;
          return acc;
        }, {} as Record<string, string>)
      );
    }
  };

  const loadMatches = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id, status, pool_group_id, home_cap_color, away_cap_color,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('tournament_id', tournamentId)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    if (data) setMatches(data as MatchItem[]);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentName) return;
    const { data, error } = await supabase.from('tournaments').insert([{ name: tournamentName }]).select().single();
    if (error) {
      console.error(error);
      return;
    }
    setTournamentName('');
    if (data) {
      await loadTournaments();
      setSelectedTournament(data.id);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolName || !selectedTournament) return;
    const { error } = await supabase.from('pool_groups').insert([{ tournament_id: selectedTournament, name: poolName }]);
    if (error) {
      console.error(error);
      return;
    }
    setPoolName('');
    loadPools(selectedTournament);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !selectedTournament) return;
    const { error } = await supabase.from('teams').insert([
      {
        name: newTeamName,
        tournament_id: selectedTournament,
        pool_group_id: newTeamPoolId || null,
      },
    ]);
    if (error) {
      console.error(error);
      return;
    }
    setNewTeamName('');
    setNewTeamPoolId('');
    loadTeams(selectedTournament);
  };

  const handleAssignTeamPool = async (teamId: string, poolId: string) => {
    const { error } = await supabase.from('teams').update({ pool_group_id: poolId || null }).eq('id', teamId);
    if (error) {
      console.error(error);
      return;
    }
    loadTeams(selectedTournament);
  };

  const handleScheduleFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !homeId || !awayId || homeId === awayId) return;
    const { error } = await supabase.from('matches').insert([
      {
        tournament_id: selectedTournament,
        pool_group_id: selectedPoolId || null,
        home_team_id: homeId,
        away_team_id: awayId,
        home_cap_color: homeCap,
        away_cap_color: awayCap,
        status: 'scheduled',
      },
    ]);
    if (error) {
      console.error(error);
      return;
    }
    setHomeId('');
    setAwayId('');
    setSelectedPoolId('');
    loadMatches(selectedTournament);
  };

  const poolNameById = (poolId?: string | null) => pools.find((pool) => pool.id === poolId)?.name ?? 'Unassigned';

  return (
    <div className="min-h-screen bg-[#0F1710] text-white p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#234723] pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#E3A355] flex items-center gap-2">
              <Trophy /> Veldt Analytics Tournament Manager
            </h1>
            <p className="text-sm text-[#667F66] mt-1">Create tournaments, pool groups, assign teams, and schedule fixtures.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.25em] text-[#E3A355]">Active Tournament</label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-[#162217] border border-[#E3A355] text-[#E3A355] px-4 py-2 rounded-lg font-bold"
            >
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-[#162217] border border-[#234723] p-5 rounded-xl space-y-5">
            <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
              <Plus size={16} /> Create Tournament
            </div>
            <form onSubmit={handleCreateTournament} className="space-y-3">
              <input
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Tournament Name (e.g. 2026 National Cup)"
                className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
              />
              <button className="w-full bg-[#E3A355] text-black font-bold px-4 py-3 rounded-lg hover:bg-[#d8a44d]">
                Save Tournament
              </button>
            </form>
          </section>

          <section className="bg-[#162217] border border-[#234723] p-5 rounded-xl space-y-5">
            <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
              <Layers size={16} /> Define Pool Groups
            </div>
            <form onSubmit={handleCreatePool} className="space-y-3">
              <input
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                placeholder="Pool Name (e.g. Pool A)"
                className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
              />
              <button className="w-full bg-[#234723] hover:bg-[#2e5c2e] text-[#E3A355] font-bold px-4 py-3 rounded-lg">
                Add Pool Group
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {pools.map((pool) => (
                <span key={pool.id} className="bg-[#0F1710] border border-[#234723] px-3 py-1 rounded text-xs text-[#E3A355]">
                  {pool.name}
                </span>
              ))}
            </div>
          </section>

          <section className="bg-[#162217] border border-[#234723] p-5 rounded-xl space-y-5">
            <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
              <Users size={16} /> Create Teams
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team Name"
                className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
              />
              <select
                value={newTeamPoolId}
                onChange={(e) => setNewTeamPoolId(e.target.value)}
                className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
              >
                <option value="">Assign to Pool (optional)</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>{pool.name}</option>
                ))}
              </select>
              <button className="w-full bg-[#234723] hover:bg-[#2e5c2e] text-white font-bold px-4 py-3 rounded-lg">
                Create Team
              </button>
            </form>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-[#162217] border border-[#234723] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
                <Users size={16} /> Teams & Pools
              </div>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <div key={team.id} className="grid grid-cols-1 gap-3 p-3 rounded-xl border border-[#234723] bg-[#0B1610]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm">{team.name}</span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#667F66]">
                      {poolNameById(team.pool_group_id)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={teamPoolUpdates[team.id] ?? team.pool_group_id ?? ''}
                      onChange={(e) => setTeamPoolUpdates((prev) => ({ ...prev, [team.id]: e.target.value }))}
                      className="flex-1 bg-[#0F1710] border border-[#234723] p-2 rounded text-sm text-white"
                    >
                      <option value="">Unassigned</option>
                      {pools.map((pool) => (
                        <option key={pool.id} value={pool.id}>{pool.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignTeamPool(team.id, teamPoolUpdates[team.id] ?? '')}
                      className="px-3 py-2 bg-[#E3A355] text-black rounded text-sm font-semibold"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#162217] border border-[#234723] p-5 rounded-xl space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
              <Calendar size={16} /> Schedule Fixtures
            </div>
            <form onSubmit={handleScheduleFixture} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-[#667F66]">Pool Group</label>
                  <select
                    value={selectedPoolId}
                    onChange={(e) => setSelectedPoolId(e.target.value)}
                    className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
                  >
                    <option value="">No Pool / Exhibition</option>
                    {pools.map((pool) => (
                      <option key={pool.id} value={pool.id}>{pool.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1 text-[#667F66]">Home Team</label>
                  <select
                    value={homeId}
                    onChange={(e) => setHomeId(e.target.value)}
                    className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
                  >
                    <option value="">Select Home Team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1 text-[#667F66]">Away Team</label>
                  <select
                    value={awayId}
                    onChange={(e) => setAwayId(e.target.value)}
                    className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
                  >
                    <option value="">Select Away Team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1 text-[#667F66]">Home Cap</label>
                    <select
                      value={homeCap}
                      onChange={(e) => setHomeCap(e.target.value as 'white' | 'blue' | 'dark')}
                      className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
                    >
                      <option value="white">White Caps</option>
                      <option value="blue">Blue Caps</option>
                      <option value="dark">Dark Caps</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-[#667F66]">Away Cap</label>
                    <select
                      value={awayCap}
                      onChange={(e) => setAwayCap(e.target.value as 'white' | 'blue' | 'dark')}
                      className="w-full bg-[#0F1710] border border-[#234723] p-3 rounded text-sm text-white"
                    >
                      <option value="blue">Blue Caps</option>
                      <option value="white">White Caps</option>
                      <option value="dark">Dark Caps</option>
                    </select>
                  </div>
                </div>
              </div>

              <button className="w-full bg-[#E3A355] text-black font-extrabold px-5 py-3 rounded-lg hover:bg-[#d8a44d]">
                Save Fixture
              </button>
            </form>

            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#667F66]">Scheduled Fixtures</h3>
              {matches.length === 0 ? (
                <p className="text-sm text-[#A0AC93]">No fixtures scheduled yet.</p>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => (
                    <div key={match.id} className="rounded-xl border border-[#234723] bg-[#0B1610] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-white">
                        <span>{match.home_team?.name ?? 'Home'} vs {match.away_team?.name ?? 'Away'}</span>
                        <span className="text-[#E3A355]">{poolNameById(match.pool_group_id)}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#A0AC93]">
                        {match.home_cap_color ?? 'white'} / {match.away_cap_color ?? 'blue'} • {match.status ?? 'scheduled'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
