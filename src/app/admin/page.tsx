'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Plus, Calendar, Layers, Users } from 'lucide-react';
import Header from '@/components/Header';
import CSVUploader from '@/components/CSVUploader';

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
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'github' });
    } catch (err) {
      console.error('Sign-in error', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('devSignIn') === '1') {
            if (mounted) setSession({ user: { id: 'dev' } });
            if (mounted) setLoadingAuth(false);
            return;
          }
        }
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (mounted) setSession(s);
      } catch (err) {
        console.error('auth check', err);
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      setSession(sessionData ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const getAccessToken = async () => {
    try {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      // Dev-mode sign-in shortcut via query param
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('devSignIn') === '1') return 'dev-token';
      }
      return (s as any)?.access_token ?? null;
    } catch (err) {
      console.error('get token', err);
      return null;
    }
  };
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

  const loadTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
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
  }, [selectedTournament]);

  const loadPools = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('pool_groups')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    if (data) setPools(data as PoolGroup[]);
  };

  const loadTeams = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name', { ascending: true });
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
        teamsWithPools.reduce(
          (acc, team) => {
            if (team.pool_group_id) acc[team.id] = team.pool_group_id;
            return acc;
          },
          {} as Record<string, string>
        )
      );
    }
  };

  const loadMatches = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select(
        `
        id, status, pool_group_id, home_cap_color, away_cap_color,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      )
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
    const token = await getAccessToken();
    if (!token) return console.error('no token');
    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: tournamentName }),
    });
    const json = await res.json();
    if (!res.ok) return console.error(json);
    setTournamentName('');
    await loadTournaments();
    setSelectedTournament(json.data?.id ?? '');
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolName || !selectedTournament) return;
    const token = await getAccessToken();
    if (!token) return console.error('no token');
    const res = await fetch('/api/admin/pools', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ tournament_id: selectedTournament, name: poolName }),
    });
    const json = await res.json();
    if (!res.ok) return console.error(json);
    setPoolName('');
    loadPools(selectedTournament);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !selectedTournament) return;
    const token = await getAccessToken();
    if (!token) return console.error('no token');
    const res = await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: newTeamName,
        tournament_id: selectedTournament,
        pool_group_id: newTeamPoolId || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return console.error(json);
    setNewTeamName('');
    setNewTeamPoolId('');
    loadTeams(selectedTournament);
  };

  const handleAssignTeamPool = async (teamId: string, poolId: string) => {
    const token = await getAccessToken();
    if (!token) return console.error('no token');
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ pool_group_id: poolId || null }),
    });
    const json = await res.json();
    if (!res.ok) return console.error(json);
    loadTeams(selectedTournament);
  };

  const handleScheduleFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !homeId || !awayId || homeId === awayId) return;
    const token = await getAccessToken();
    if (!token) return console.error('no token');
    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tournament_id: selectedTournament,
        pool_group_id: selectedPoolId || null,
        home_team_id: homeId,
        away_team_id: awayId,
        home_cap_color: homeCap,
        away_cap_color: awayCap,
        status: 'scheduled',
      }),
    });
    const json = await res.json();
    if (!res.ok) return console.error(json);
    setHomeId('');
    setAwayId('');
    setSelectedPoolId('');
    loadMatches(selectedTournament);
  };

  const poolNameById = (poolId?: string | null) =>
    pools.find((pool) => pool.id === poolId)?.name ?? 'Unassigned';

  if (loadingAuth) {
    return (
      <div style={{ background: 'var(--bg-soft)' }} className="min-h-screen p-6 font-sans">
        <Header />
        <div className="max-w-6xl mx-auto text-center mt-20">Checking authentication...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ background: 'var(--bg-soft)' }} className="min-h-screen p-6 font-sans">
        <Header />
        <div className="max-w-6xl mx-auto text-center mt-20">
          <h2 className="text-xl font-bold">Admin access required</h2>
          <p className="text-sm text-[#A0AC93] mt-2">Please sign in to access the admin panel.</p>
          <div className="mt-4">
            <button
              onClick={handleSignIn}
              className="bg-var px-6 py-3 rounded font-bold"
              style={{ background: 'var(--veldt-ochre)' }}
            >
              Sign in with GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-soft)' }} className="min-h-screen p-6 font-sans">
      <Header />
      <div className="max-w-6xl mx-auto space-y-6">
        <header
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b"
          style={{ borderColor: 'var(--muted-slate)' }}
        >
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--veldt-green)' }}>
              <Trophy /> Veldt Analytics Tournament Manager
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Create tournaments, pool groups, assign teams, and schedule fixtures.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.25em] text-[#E3A355]">
              Active Tournament
            </label>
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
          <section
            className="bg-white border p-5 rounded-xl space-y-5"
            style={{ borderColor: 'var(--muted-slate)' }}
          >
            <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
              <Plus size={16} /> Create Tournament
            </div>
            <form onSubmit={handleCreateTournament} className="space-y-3">
              <input
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Tournament Name (e.g. 2026 National Cup)"
                className="w-full p-3 rounded text-sm"
                style={{ border: '1px solid var(--muted-slate)', background: 'var(--card-white)' }}
              />
              <button
                className="w-full bg-var"
                style={{
                  background: 'var(--veldt-ochre)',
                  color: '#000',
                  fontWeight: 700,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                }}
              >
                Save Tournament
              </button>
            </form>
          </section>

          <section
            className="bg-white border p-5 rounded-xl space-y-5"
            style={{ borderColor: 'var(--muted-slate)' }}
          >
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
                <span
                  key={pool.id}
                  className="px-3 py-1 rounded text-xs"
                  style={{
                    background: 'var(--card-white)',
                    border: '1px solid var(--muted-slate)',
                    color: 'var(--veldt-green)',
                  }}
                >
                  {pool.name}
                </span>
              ))}
            </div>
          </section>

          <section
            className="bg-white border p-5 rounded-xl space-y-5"
            style={{ borderColor: 'var(--muted-slate)' }}
          >
            <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
              <Users size={16} /> Create Teams
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team Name"
                className="w-full p-3 rounded text-sm"
                style={{ border: '1px solid var(--muted-slate)', background: 'var(--card-white)' }}
              />
              <select
                value={newTeamPoolId}
                onChange={(e) => setNewTeamPoolId(e.target.value)}
                className="w-full p-3 rounded text-sm"
                style={{ border: '1px solid var(--muted-slate)', background: 'var(--card-white)' }}
              >
                <option value="">Assign to Pool (optional)</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
              <button
                className="w-full"
                style={{
                  background: 'var(--veldt-green)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                }}
              >
                Create Team
              </button>
            </form>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section
            className="bg-white border p-5 rounded-xl space-y-4"
            style={{ borderColor: 'var(--muted-slate)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#E3A355] font-bold uppercase tracking-[0.2em] text-xs">
                <Users size={16} /> Teams & Pools
              </div>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="grid grid-cols-1 gap-3 p-3 rounded-xl border"
                  style={{ borderColor: 'var(--muted-slate)', background: 'var(--card-white)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm">{team.name}</span>
                    <span
                      className="text-[11px] uppercase tracking-[0.2em]"
                      style={{ color: 'var(--muted-text)' }}
                    >
                      {poolNameById(team.pool_group_id)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={teamPoolUpdates[team.id] ?? team.pool_group_id ?? ''}
                      onChange={(e) =>
                        setTeamPoolUpdates((prev) => ({ ...prev, [team.id]: e.target.value }))
                      }
                      className="flex-1 p-2 rounded text-sm"
                      style={{
                        border: '1px solid var(--muted-slate)',
                        background: 'var(--card-white)',
                      }}
                    >
                      <option value="">Unassigned</option>
                      {pools.map((pool) => (
                        <option key={pool.id} value={pool.id}>
                          {pool.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignTeamPool(team.id, teamPoolUpdates[team.id] ?? '')}
                      className="px-3 py-2 rounded text-sm font-semibold"
                      style={{ background: 'var(--veldt-ochre)', color: '#000' }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#162217] border border-[#234723] p-5 rounded-xl space-y-4 lg:col-span-2">
            <div
              className="flex items-center gap-2 font-bold uppercase tracking-[0.2em] text-xs"
              style={{ color: 'var(--veldt-green)' }}
            >
              <Calendar size={16} /> Schedule Fixtures
            </div>
            <div className="mt-3">
              <CSVUploader tournamentId={selectedTournament} />
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
                      <option key={pool.id} value={pool.id}>
                        {pool.name}
                      </option>
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
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
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
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
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
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#667F66]">
                Scheduled Fixtures
              </h3>
              {matches.length === 0 ? (
                <p className="text-sm text-[#A0AC93]">No fixtures scheduled yet.</p>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/scorekeeper/${match.id}`}
                      className="block rounded-xl border border-[#234723] bg-[#0B1610] p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-white">
                        <span>
                          {match.home_team?.name ?? 'Home'} vs {match.away_team?.name ?? 'Away'}
                        </span>
                        <span className="text-[#E3A355]">{poolNameById(match.pool_group_id)}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#A0AC93]">
                        {match.home_cap_color ?? 'white'} / {match.away_cap_color ?? 'blue'} •{' '}
                        {match.status ?? 'scheduled'}
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E3A355] px-3 py-2 text-xs font-bold text-black">
                        Open Scorekeeper
                      </div>
                    </Link>
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
