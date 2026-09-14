'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  LogIn,
  Plus,
  RefreshCw,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';

type Category = 'BOYS' | 'GIRLS' | 'MIXED';
type ParticipationType = 'STANDARD' | 'INVITATIONAL' | 'EXHIBITION';

type SessionUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type Tournament = {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  competition_category?: Category | null;
  created_at?: string | null;
};

type StagedPool = { tempId: string; name: string };

type StagedTeam = {
  tempId: string;
  name: string;
  city: string;
  province: string;
  poolName: string;
  participationType: ParticipationType;
};

type StagedFixture = {
  tempId: string;
  matchNumber: number;
  poolName: string;
  scheduledTime: string | null;
  homeTeam: string;
  awayTeam: string;
  homeCapColor: 'white' | 'blue' | 'dark';
  awayCapColor: 'white' | 'blue' | 'dark';
  poolLocation: string;
  roundType: string;
  stageType: string;
  stageName: string;
  stageOrder: number | null;
};

type ExistingTournament = {
  id: string;
  name: string;
  competition_category?: Category | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
};

const PARTICIPATION_OPTIONS: { value: ParticipationType; label: string }[] = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'INVITATIONAL', label: 'Invitational' },
  { value: 'EXHIBITION', label: 'Exhibition' },
];

const STEPS = [
  { number: 1, label: 'Tournament' },
  { number: 2, label: 'Pools' },
  { number: 3, label: 'Teams' },
  { number: 4, label: 'Fixtures' },
  { number: 5, label: 'Review' },
];

const VALID_CAP_COLORS = ['white', 'blue', 'dark'] as const;

function normaliseString(value: unknown): string {
  return String(value ?? '').trim();
}

function normaliseParticipationType(value: unknown): ParticipationType {
  const v = normaliseString(value).toUpperCase();
  return v === 'INVITATIONAL' || v === 'EXHIBITION' ? v : 'STANDARD';
}

function normaliseCapColor(
  value: unknown,
  fallback: 'white' | 'blue' | 'dark'
): 'white' | 'blue' | 'dark' {
  const v = normaliseString(value).toLowerCase();
  return VALID_CAP_COLORS.includes(v as (typeof VALID_CAP_COLORS)[number])
    ? (v as 'white' | 'blue' | 'dark')
    : fallback;
}

function parseFixtureDate(value: unknown): string | null {
  const text = normaliseString(value);
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (iso) {
    const [, y, m, d, h, min] = iso;
    const date = new Date(`${y}-${m}-${d}T${h.padStart(2, '0')}:${min}:00+02:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createFixture(row: Record<string, unknown>, index: number): StagedFixture {
  const matchNumberText = normaliseString(row.match_number ?? row.match ?? row.number);
  const stageOrderText = normaliseString(row.stage_order);
  const rawPool = normaliseString(row.pool ?? row.group ?? row.pool_group);
  const rawStageType = normaliseString(row.stage_type ?? row.stage ?? row.stageType);
  const stageType = rawStageType ? rawStageType.toUpperCase() : rawPool ? 'POOL' : 'KNOCKOUT';
  const stageName =
    normaliseString(row.stage_name ?? row.stageName) ||
    (stageType === 'POOL' ? 'Pool Stage' : 'Knockout');

  const scheduledTime = parseFixtureDate(row.scheduled_time ?? row.date_time ?? row.datetime);

  return {
    tempId: `fixture-${index}-${Date.now()}`,
    matchNumber: Number(matchNumberText),
    poolName: rawPool,
    scheduledTime,
    homeTeam: normaliseString(row.home_team ?? row.home ?? row.home_team_name),
    awayTeam: normaliseString(row.away_team ?? row.away ?? row.away_team_name),
    homeCapColor: normaliseCapColor(row.home_cap_color, 'white'),
    awayCapColor: normaliseCapColor(row.away_cap_color, 'blue'),
    poolLocation: normaliseString(row.pool_location ?? row.location),
    roundType:
      normaliseString(row.round_type ?? row.round) || (stageType === 'POOL' ? 'Pool' : 'Knockout'),
    stageType,
    stageName,
    stageOrder: stageOrderText ? Number(stageOrderText) : stageType === 'POOL' ? 1 : null,
  };
}

function parseMatchSlot(
  value: string
): { type: 'MATCH_WINNER' | 'MATCH_LOSER'; sourceMatchNumber: number } | null {
  const text = normaliseString(value).toLowerCase();
  const match = text.match(/\b(winner|loser)\s+(?:game|match)\s*(\d+)\b/);
  if (!match) return null;
  return {
    type: match[1] === 'winner' ? 'MATCH_WINNER' : 'MATCH_LOSER',
    sourceMatchNumber: Number(match[2]),
  };
}

function getFixtureErrors(
  fixture: StagedFixture,
  poolNames: Set<string>,
  stagedTeamNames: Set<string>
): string[] {
  const errors: string[] = [];
  const poolKey = fixture.poolName.toLowerCase();
  const homeKey = fixture.homeTeam.toLowerCase();
  const awayKey = fixture.awayTeam.toLowerCase();

  if (!Number.isFinite(fixture.matchNumber) || fixture.matchNumber <= 0) {
    errors.push('match number must be a positive number');
  }
  if (!fixture.homeTeam) errors.push('home team is missing');
  if (!fixture.awayTeam) errors.push('away team is missing');
  if (fixture.homeTeam && fixture.awayTeam && homeKey === awayKey) {
    errors.push('home and away teams cannot be the same');
  }
  if (fixture.stageType === 'POOL' && !fixture.poolName) {
    errors.push('pool is required for a pool-stage fixture');
  }
  if (fixture.poolName && fixture.stageType === 'POOL' && !poolNames.has(poolKey)) {
    errors.push(`pool "${fixture.poolName}" is not in the staged pools`);
  }
  if (fixture.stageType !== 'POOL' && fixture.poolName && !poolNames.has(poolKey)) {
    errors.push(`pool "${fixture.poolName}" is not in the staged pools`);
  }
  const homeSlot = parseMatchSlot(fixture.homeTeam);
  const awaySlot = parseMatchSlot(fixture.awayTeam);
  if (fixture.homeTeam && !stagedTeamNames.has(homeKey) && !homeSlot) {
    errors.push(`home team "${fixture.homeTeam}" is not in the staged teams`);
  }
  if (fixture.awayTeam && !stagedTeamNames.has(awayKey) && !awaySlot) {
    errors.push(`away team "${fixture.awayTeam}" is not in the staged teams`);
  }
  if (fixture.homeTeam && (homeKey.includes('winner') || homeKey.includes('loser'))) {
    if (!homeSlot)
      errors.push(`home slot "${fixture.homeTeam}" must reference Winner Game N or Loser Game N`);
  }
  if (fixture.awayTeam && (awayKey.includes('winner') || awayKey.includes('loser'))) {
    if (!awaySlot)
      errors.push(`away slot "${fixture.awayTeam}" must reference Winner Game N or Loser Game N`);
  }
  if (!fixture.scheduledTime) errors.push('scheduled time is missing or invalid');
  return errors;
}

function statusLabel(category: Category | null | undefined): string {
  return category === 'BOYS' ? 'Boys' : category === 'GIRLS' ? 'Girls' : 'Mixed';
}

export default function AdminPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [existingTournaments, setExistingTournaments] = useState<ExistingTournament[]>([]);
  const [selectedExistingTournamentId, setSelectedExistingTournamentId] = useState('');

  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCategory, setTournamentCategory] = useState<Category>('GIRLS');
  const [tournamentStartDate, setTournamentStartDate] = useState('');
  const [tournamentEndDate, setTournamentEndDate] = useState('');
  const [tournamentLocation, setTournamentLocation] = useState('');

  const [stagedPools, setStagedPools] = useState<StagedPool[]>([]);
  const [newPoolName, setNewPoolName] = useState('');

  const [stagedTeams, setStagedTeams] = useState<StagedTeam[]>([]);
  const [teamName, setTeamName] = useState('');
  const [teamCity, setTeamCity] = useState('');
  const [teamProvince, setTeamProvince] = useState('');
  const [teamPoolName, setTeamPoolName] = useState('');
  const [teamParticipationType, setTeamParticipationType] = useState<ParticipationType>('STANDARD');

  const [stagedFixtures, setStagedFixtures] = useState<StagedFixture[]>([]);
  const [fixtureFileName, setFixtureFileName] = useState('');
  const [fixtureErrors, setFixtureErrors] = useState<string[]>([]);

  const getAccessToken = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('devSignIn') === '1') return 'dev-token';
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadExistingTournaments = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/admin/tournaments', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (response.ok) {
      setExistingTournaments((result.data ?? []) as ExistingTournament[]);
      if (!selectedExistingTournamentId && result.data?.[0]?.id) {
        setSelectedExistingTournamentId(result.data[0].id);
      }
    }
  }, [getAccessToken, selectedExistingTournamentId]);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        if (new URLSearchParams(window.location.search).get('devSignIn') === '1') {
          if (mounted) {
            setUser({ id: 'dev', email: 'dev@veldt.local' });
            setAuthLoading(false);
          }
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setUser((data.session?.user as SessionUser | undefined) ?? null);
          setAuthLoading(false);
        }
      } catch {
        if (mounted) setAuthLoading(false);
      }
    }
    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser((session?.user as SessionUser | undefined) ?? null);
        setAuthLoading(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) void loadExistingTournaments();
  }, [user, loadExistingTournaments]);

  const tournamentComplete = Boolean(
    tournamentName.trim() && tournamentStartDate && tournamentEndDate && tournamentLocation.trim()
  );
  const poolNames = useMemo(
    () => new Set(stagedPools.map((pool) => pool.name.trim().toLowerCase())),
    [stagedPools]
  );
  const teamNames = useMemo(
    () => new Set(stagedTeams.map((team) => team.name.trim().toLowerCase())),
    [stagedTeams]
  );
  const allFixtureErrors = useMemo(
    () => stagedFixtures.flatMap((fixture) => getFixtureErrors(fixture, poolNames, teamNames)),
    [stagedFixtures, poolNames, teamNames]
  );
  const duplicateMatchNumbers = useMemo(() => {
    const counts = new Map<number, number>();
    stagedFixtures.forEach((fixture) =>
      counts.set(fixture.matchNumber, (counts.get(fixture.matchNumber) ?? 0) + 1)
    );
    return [...counts.entries()].filter(([, count]) => count > 1).map(([number]) => number);
  }, [stagedFixtures]);
  const reviewReady =
    tournamentComplete &&
    stagedPools.length > 0 &&
    stagedTeams.length > 0 &&
    stagedFixtures.length > 0 &&
    allFixtureErrors.length === 0 &&
    duplicateMatchNumbers.length === 0;

  const signIn = async () => {
    const redirectTo =
      window.location.hostname === 'water-polo-platform.vercel.app'
        ? 'https://water-polo-platform.vercel.app/admin'
        : `${window.location.origin}/admin`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    });
    if (authError) setError(authError.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  function clearNotices() {
    setError(null);
    setMessage(null);
  }

  function addPool() {
    clearNotices();
    const name = newPoolName.trim();
    if (!name) return setError('Enter a pool/group name.');
    if (poolNames.has(name.toLowerCase())) return setError(`Pool "${name}" is already staged.`);
    setStagedPools((prev) => [...prev, { tempId: crypto.randomUUID(), name }]);
    setNewPoolName('');
  }

  function addTeam() {
    clearNotices();
    const name = teamName.trim();
    if (!name) return setError('Enter a team name.');
    if (teamPoolName && !poolNames.has(teamPoolName.trim().toLowerCase()))
      return setError('Select a valid staged pool for the team.');
    if (teamNames.has(name.toLowerCase())) return setError(`Team "${name}" is already staged.`);
    setStagedTeams((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        name,
        city: teamCity.trim(),
        province: teamProvince.trim(),
        poolName: teamPoolName.trim(),
        participationType: teamParticipationType,
      },
    ]);
    setTeamName('');
    setTeamCity('');
    setTeamProvince('');
    setTeamPoolName('');
    setTeamParticipationType('STANDARD');
  }

  function removePool(tempId: string) {
    const pool = stagedPools.find((item) => item.tempId === tempId);
    setStagedPools((prev) => prev.filter((item) => item.tempId !== tempId));
    if (pool) {
      setStagedTeams((prev) =>
        prev.map((team) =>
          team.poolName.toLowerCase() === pool.name.toLowerCase() ? { ...team, poolName: '' } : team
        )
      );
      setStagedFixtures((prev) =>
        prev.map((fixture) =>
          fixture.poolName.toLowerCase() === pool.name.toLowerCase()
            ? { ...fixture, poolName: '' }
            : fixture
        )
      );
    }
  }

  function removeTeam(tempId: string) {
    setStagedTeams((prev) => prev.filter((team) => team.tempId !== tempId));
  }

  function handleFixtureFile(event: React.ChangeEvent<HTMLInputElement>) {
    clearNotices();
    const file = event.target.files?.[0];
    if (!file) return;
    setFixtureFileName(file.name);
    setFixtureErrors([]);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.errors.length) {
          setFixtureErrors(results.errors.map((item) => item.message));
          return;
        }
        const fixtures = results.data.map(createFixture);
        const importedTeamNames = new Map<string, StagedTeam>();
        for (const team of stagedTeams) importedTeamNames.set(team.name.toLowerCase(), team);
        for (const fixture of fixtures) {
          for (const name of [fixture.homeTeam, fixture.awayTeam]) {
            const key = name.toLowerCase();
            if (
              name &&
              !importedTeamNames.has(key) &&
              !key.includes('winner') &&
              !key.includes('loser')
            ) {
              const poolName = fixture.poolName;
              importedTeamNames.set(key, {
                tempId: crypto.randomUUID(),
                name,
                city: '',
                province: '',
                poolName,
                participationType: 'STANDARD',
              });
            }
          }
        }
        const addedTeams = [...importedTeamNames.values()].filter(
          (team) => !teamNames.has(team.name.toLowerCase())
        );
        if (addedTeams.length) setStagedTeams((prev) => [...prev, ...addedTeams]);
        setStagedFixtures(fixtures);
        setFixtureErrors([]);
        setCurrentStep(4);
      },
      error: (parseError) => setFixtureErrors([parseError.message]),
    });
  }

  async function finaliseTournament() {
    clearNotices();
    if (!reviewReady) {
      setError('Complete and correct the tournament setup before creating it.');
      return;
    }

    try {
      setSaving(true);
      const token = await getAccessToken();
      if (!token) throw new Error('Your login session has expired. Please sign in again.');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      const tournamentResponse = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: tournamentName.trim(),
          startDate: tournamentStartDate,
          endDate: tournamentEndDate,
          location: tournamentLocation.trim(),
          competitionCategory: tournamentCategory,
          status: 'active',
        }),
      });
      const tournamentResult = await tournamentResponse.json();
      if (!tournamentResponse.ok)
        throw new Error(
          tournamentResult.error?.message ??
            tournamentResult.error ??
            'Failed to create tournament.'
        );
      const tournamentId = tournamentResult.tournament?.id ?? tournamentResult.data?.id;
      if (!tournamentId)
        throw new Error('Tournament was created but no tournament ID was returned.');

      const poolIdByName = new Map<string, string>();
      for (const pool of stagedPools) {
        const response = await fetch('/api/admin/pools', {
          method: 'POST',
          headers,
          body: JSON.stringify({ tournament_id: tournamentId, name: pool.name }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message ?? result.error ?? `Failed to create ${pool.name}.`
          );
        poolIdByName.set(pool.name.toLowerCase(), result.data.id);
      }

      const teamIdByName = new Map<string, string>();
      for (const team of stagedTeams) {
        const response = await fetch('/api/admin/teams', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: team.name,
            tournamentId,
            poolGroupId: team.poolName
              ? (poolIdByName.get(team.poolName.toLowerCase()) ?? null)
              : null,
            city: team.city || null,
            province: team.province || null,
            participationType: team.participationType,
          }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message ?? result.error ?? `Failed to register ${team.name}.`
          );
        teamIdByName.set(
          team.name.toLowerCase(),
          result.team?.id ?? result.tournamentTeam?.team_id
        );
      }

      const createdMatchIdByNumber = new Map<number, string>();
      const remainingFixtures = [...stagedFixtures].sort((a, b) => a.matchNumber - b.matchNumber);
      let safetyCounter = 0;

      while (remainingFixtures.length) {
        const beforeCount = remainingFixtures.length;
        safetyCounter += 1;
        if (safetyCounter > stagedFixtures.length + 5) {
          throw new Error(
            'Fixture progression could not be resolved. Check Winner/Loser references in the CSV.'
          );
        }

        for (let index = remainingFixtures.length - 1; index >= 0; index -= 1) {
          const fixture = remainingFixtures[index];
          const poolId = fixture.poolName
            ? (poolIdByName.get(fixture.poolName.toLowerCase()) ?? null)
            : null;
          const homeId = teamIdByName.get(fixture.homeTeam.toLowerCase());
          const awayId = teamIdByName.get(fixture.awayTeam.toLowerCase());
          const homeSlot = fixture.homeTeam ? parseMatchSlot(fixture.homeTeam) : null;
          const awaySlot = fixture.awayTeam ? parseMatchSlot(fixture.awayTeam) : null;

          const homeSourceId = homeSlot
            ? createdMatchIdByNumber.get(homeSlot.sourceMatchNumber)
            : null;
          const awaySourceId = awaySlot
            ? createdMatchIdByNumber.get(awaySlot.sourceMatchNumber)
            : null;

          if (homeSlot && !homeSourceId) continue;
          if (awaySlot && !awaySourceId) continue;
          if (!homeId && !homeSlot)
            throw new Error(
              `Could not resolve home team "${fixture.homeTeam}" for match ${fixture.matchNumber}.`
            );
          if (!awayId && !awaySlot)
            throw new Error(
              `Could not resolve away team "${fixture.awayTeam}" for match ${fixture.matchNumber}.`
            );

          const response = await fetch('/api/admin/matches', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              tournament_id: tournamentId,
              pool_group_id: poolId,
              home_team_id: homeId ?? null,
              away_team_id: awayId ?? null,
              home_slot_type: homeSlot?.type ?? null,
              home_slot_id: homeSourceId ?? null,
              away_slot_type: awaySlot?.type ?? null,
              away_slot_id: awaySourceId ?? null,
              home_cap_color: fixture.homeCapColor,
              away_cap_color: fixture.awayCapColor,
              status: 'scheduled',
              scheduled_time: fixture.scheduledTime,
              pool_location: fixture.poolLocation || null,
              match_number: fixture.matchNumber,
              round_type: fixture.roundType || null,
              stage_type: fixture.stageType || (poolId ? 'POOL' : null),
              stage_name: fixture.stageName || (poolId ? 'Pool Stage' : null),
              stage_order: fixture.stageOrder,
            }),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error?.message ??
                result.error ??
                `Failed to create match ${fixture.matchNumber}.`
            );

          const createdMatchId = result.data?.id ?? result.match?.id;
          if (!createdMatchId)
            throw new Error(
              `Match ${fixture.matchNumber} was created but no match ID was returned.`
            );
          createdMatchIdByNumber.set(fixture.matchNumber, createdMatchId);
          remainingFixtures.splice(index, 1);
        }

        if (remainingFixtures.length === beforeCount) {
          const unresolved = remainingFixtures.map((fixture) => {
            const refs = [fixture.homeTeam, fixture.awayTeam]
              .map(parseMatchSlot)
              .filter(Boolean)
              .map((slot) => `Match ${slot!.sourceMatchNumber}`);
            return `Match ${fixture.matchNumber} (${refs.join(' / ') || 'unknown dependency'})`;
          });
          throw new Error(`Could not resolve fixture dependencies: ${unresolved.join(', ')}.`);
        }
      }

      setMessage(
        `Tournament "${tournamentName.trim()}" created successfully with ${stagedPools.length} pools, ${stagedTeams.length} teams and ${stagedFixtures.length} fixtures.`
      );
      setCurrentStep(1);
      setTournamentName('');
      setTournamentStartDate('');
      setTournamentEndDate('');
      setTournamentLocation('');
      setTournamentCategory('GIRLS');
      setStagedPools([]);
      setStagedTeams([]);
      setStagedFixtures([]);
      setFixtureFileName('');
      await loadExistingTournaments();
    } catch (finaliseError) {
      console.error('Tournament finalisation failed:', finaliseError);
      setError(
        finaliseError instanceof Error ? finaliseError.message : 'Tournament creation failed.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-soft)]">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-veldt-ochre" />
          <p className="mt-4 font-semibold text-veldt-green">Checking authentication...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-soft)]">
        <Header />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl items-center justify-center px-4 py-12">
          <div className="w-full rounded-3xl border border-veldt-border bg-white p-10 text-center shadow-sm">
            <Trophy className="mx-auto h-10 w-10 text-veldt-green" />
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-veldt-ochre">
              Veldt Analytics
            </p>
            <h1 className="mt-2 text-3xl font-black text-veldt-green">Create Tournament</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              Sign in with GitHub to build a tournament, pools, teams and fixtures.
            </p>
            <button
              type="button"
              onClick={signIn}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-veldt-green px-6 py-3.5 text-sm font-black text-white"
            >
              <LogIn className="h-5 w-5" />
              Sign in with GitHub
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-soft)]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-veldt-ochre">
              Tournament Management
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-veldt-green sm:text-4xl">
              Create Tournament
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Set up the complete competition before anything is written to the database.
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm font-bold text-slate-600"
          >
            Sign out
          </button>
        </div>

        {(error || message) && (
          <div className="mt-6 space-y-3">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-veldt-border bg-white p-3 shadow-sm">
          <div className="grid grid-cols-5 gap-1">
            {STEPS.map((step) => {
              const active = currentStep === step.number;
              const complete = currentStep > step.number;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => step.number < currentStep && setCurrentStep(step.number)}
                  className={`rounded-xl px-2 py-3 text-center ${active ? 'bg-veldt-green text-white' : complete ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'}`}
                >
                  <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black">
                    {complete ? <Check className="h-4 w-4" /> : step.number}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-wider sm:text-xs">
                    {step.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-veldt-border bg-white p-6 shadow-sm sm:p-8">
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-veldt-green" />
                <div>
                  <h2 className="text-xl font-black text-veldt-green">Tournament details</h2>
                  <p className="text-sm text-slate-500">
                    These details become the parent tournament record.
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="label">Tournament Name</span>
                  <input
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="Mackenzie Cup 2026"
                    className="field"
                  />
                </label>
                <label>
                  <span className="label">Category</span>
                  <select
                    value={tournamentCategory}
                    onChange={(e) => setTournamentCategory(e.target.value as Category)}
                    className="field"
                  >
                    <option value="GIRLS">Girls</option>
                    <option value="BOYS">Boys</option>
                    <option value="MIXED">Mixed</option>
                  </select>
                </label>
                <label>
                  <span className="label">Location</span>
                  <input
                    value={tournamentLocation}
                    onChange={(e) => setTournamentLocation(e.target.value)}
                    placeholder="Cape Town"
                    className="field"
                  />
                </label>
                <label>
                  <span className="label">Start Date</span>
                  <input
                    type="date"
                    value={tournamentStartDate}
                    onChange={(e) => setTournamentStartDate(e.target.value)}
                    className="field"
                  />
                </label>
                <label>
                  <span className="label">End Date</span>
                  <input
                    type="date"
                    value={tournamentEndDate}
                    onChange={(e) => setTournamentEndDate(e.target.value)}
                    className="field"
                  />
                </label>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  disabled={!tournamentComplete}
                  onClick={() => {
                    clearNotices();
                    setCurrentStep(2);
                  }}
                  className="btn-primary"
                >
                  Continue to Pools <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3">
                <Layers className="h-6 w-6 text-veldt-ochre" />
                <div>
                  <h2 className="text-xl font-black text-veldt-green">Pools / Groups</h2>
                  <p className="text-sm text-slate-500">
                    Create any pool or group names required by this tournament.
                  </p>
                </div>
              </div>
              <div className="mt-7 flex gap-3">
                <input
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPool()}
                  placeholder="Pool A"
                  className="field flex-1"
                />
                <button type="button" onClick={addPool} className="btn-gold">
                  <Plus className="h-4 w-4" />
                  Add Pool
                </button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stagedPools.map((pool) => (
                  <div
                    key={pool.tempId}
                    className="flex items-center justify-between rounded-xl border border-veldt-border bg-slate-50 px-4 py-3"
                  >
                    <span className="font-bold text-veldt-green">{pool.name}</span>
                    <button
                      type="button"
                      onClick={() => removePool(pool.tempId)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {stagedPools.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 sm:col-span-2 lg:col-span-3">
                    No pools added yet.
                  </div>
                )}
              </div>
              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={stagedPools.length === 0}
                  onClick={() => {
                    clearNotices();
                    setCurrentStep(3);
                  }}
                  className="btn-primary"
                >
                  Continue to Teams <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-veldt-green" />
                <div>
                  <h2 className="text-xl font-black text-veldt-green">Teams</h2>
                  <p className="text-sm text-slate-500">
                    Register teams and their participation status for this tournament.
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name"
                  className="field xl:col-span-2"
                />
                <input
                  value={teamCity}
                  onChange={(e) => setTeamCity(e.target.value)}
                  placeholder="City"
                  className="field"
                />
                <input
                  value={teamProvince}
                  onChange={(e) => setTeamProvince(e.target.value)}
                  placeholder="Province"
                  className="field"
                />
                <select
                  value={teamPoolName}
                  onChange={(e) => setTeamPoolName(e.target.value)}
                  className="field"
                >
                  <option value="">Unassigned</option>
                  {stagedPools.map((pool) => (
                    <option key={pool.tempId} value={pool.name}>
                      {pool.name}
                    </option>
                  ))}
                </select>
                <select
                  value={teamParticipationType}
                  onChange={(e) => setTeamParticipationType(e.target.value as ParticipationType)}
                  className="field"
                >
                  {PARTICIPATION_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addTeam}
                  className="btn-gold md:col-span-2 xl:col-span-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Team
                </button>
              </div>
              <div className="mt-7 overflow-x-auto rounded-2xl border border-veldt-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Team</th>
                      <th className="th">Pool</th>
                      <th className="th">Participation</th>
                      <th className="th">Location</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-veldt-border">
                    {stagedTeams.map((team) => (
                      <tr key={team.tempId}>
                        <td className="td font-bold text-veldt-green">{team.name}</td>
                        <td className="td">{team.poolName || 'Unassigned'}</td>
                        <td className="td">{team.participationType}</td>
                        <td className="td">
                          {[team.city, team.province].filter(Boolean).join(', ') || 'Not set'}
                        </td>
                        <td className="td text-right">
                          <button
                            type="button"
                            onClick={() => removeTeam(team.tempId)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {stagedTeams.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                          No teams added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={stagedTeams.length === 0}
                  onClick={() => {
                    clearNotices();
                    setCurrentStep(4);
                  }}
                  className="btn-primary"
                >
                  Continue to Fixtures <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-veldt-green" />
                <div>
                  <h2 className="text-xl font-black text-veldt-green">Fixtures</h2>
                  <p className="text-sm text-slate-500">
                    Import the fixtures CSV. Nothing is created until the final step.
                  </p>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <label className="btn-secondary cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Choose CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFixtureFile}
                    className="hidden"
                  />
                </label>
                {fixtureFileName && (
                  <span className="text-sm font-semibold text-slate-600">{fixtureFileName}</span>
                )}
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <strong>Expected columns:</strong> match_number, pool, home_team, away_team,
                scheduled_time, pool_location, round_type, stage_type, stage_name, stage_order. Team
                names found in the fixture file are automatically staged if they are not already
                listed.
              </div>
              {allFixtureErrors.length > 0 && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-black">Fixture validation</div>
                  <div className="mt-2 space-y-1">
                    {allFixtureErrors.slice(0, 30).map((item, index) => (
                      <div key={`${item}-${index}`}>{item}</div>
                    ))}
                  </div>
                </div>
              )}
              {duplicateMatchNumbers.length > 0 && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Duplicate match numbers: {duplicateMatchNumbers.join(', ')}
                </div>
              )}
              {stagedFixtures.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-2xl border border-veldt-border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">#</th>
                        <th className="th">Pool</th>
                        <th className="th">Home</th>
                        <th className="th">Away</th>
                        <th className="th">Stage</th>
                        <th className="th">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-veldt-border">
                      {stagedFixtures.slice(0, 50).map((fixture) => (
                        <tr key={fixture.tempId}>
                          <td className="td font-black text-veldt-green">{fixture.matchNumber}</td>
                          <td className="td">{fixture.poolName || '—'}</td>
                          <td className="td font-semibold">{fixture.homeTeam}</td>
                          <td className="td font-semibold">{fixture.awayTeam}</td>
                          <td className="td">{fixture.stageName}</td>
                          <td className="td">
                            {fixture.scheduledTime
                              ? new Date(fixture.scheduledTime).toLocaleString('en-ZA', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                  hour12: false,
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={
                    stagedFixtures.length === 0 ||
                    allFixtureErrors.length > 0 ||
                    duplicateMatchNumbers.length > 0
                  }
                  onClick={() => {
                    clearNotices();
                    setCurrentStep(5);
                  }}
                  className="btn-primary"
                >
                  Review Tournament <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-black text-veldt-green">Review & Create</h2>
                  <p className="text-sm text-slate-500">
                    Nothing is written to Supabase until you press Create Tournament.
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="summary">
                  <div className="eyebrow">Tournament</div>
                  <div className="summary-title">{tournamentName}</div>
                  <div className="summary-text">
                    {statusLabel(tournamentCategory)} · {tournamentStartDate} → {tournamentEndDate}
                  </div>
                  <div className="summary-text">{tournamentLocation}</div>
                </div>
                <div className="summary">
                  <div className="eyebrow">Setup</div>
                  <div className="summary-stats">
                    <span>{stagedPools.length} Pools</span>
                    <span>{stagedTeams.length} Teams</span>
                    <span>{stagedFixtures.length} Fixtures</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-veldt-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Pool</th>
                      <th className="th">Teams</th>
                      <th className="th">Fixtures</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-veldt-border">
                    {stagedPools.map((pool) => (
                      <tr key={pool.tempId}>
                        <td className="td font-bold text-veldt-green">{pool.name}</td>
                        <td className="td">
                          {
                            stagedTeams.filter(
                              (team) => team.poolName.toLowerCase() === pool.name.toLowerCase()
                            ).length
                          }
                        </td>
                        <td className="td">
                          {
                            stagedFixtures.filter(
                              (fixture) =>
                                fixture.poolName.toLowerCase() === pool.name.toLowerCase()
                            ).length
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!reviewReady && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Complete all required setup and resolve every fixture validation error before
                  creating the tournament.
                </div>
              )}
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => setCurrentStep(4)} className="btn-secondary">
                  <ChevronLeft className="h-4 w-4" />
                  Back to Fixtures
                </button>
                <button
                  type="button"
                  disabled={!reviewReady || saving}
                  onClick={finaliseTournament}
                  className="btn-primary px-8"
                >
                  {saving ? 'Creating Tournament...' : 'Create Tournament'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-veldt-border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-veldt-green">Existing Tournaments</h2>
              <p className="mt-1 text-sm text-slate-500">
                Existing tournaments remain separate from the new tournament being staged above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadExistingTournaments()}
              className="btn-secondary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {existingTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className={`rounded-2xl border p-4 ${selectedExistingTournamentId === tournament.id ? 'border-veldt-green bg-veldt-green/5' : 'border-veldt-border bg-slate-50'}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black text-veldt-green">{tournament.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {statusLabel(tournament.competition_category)}
                      {tournament.location ? ` · ${tournament.location}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedExistingTournamentId(tournament.id)}
                    className="text-xs font-black uppercase tracking-wider text-veldt-ochre"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
            {existingTournaments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
                No tournaments exist yet.
              </div>
            )}
          </div>
        </section>
      </main>
      <style jsx>{`
        .label {
          display: block;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
        }
        .field {
          margin-top: 0.5rem;
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          background: #fff;
          padding: 0.8rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .field:focus {
          border-color: #d8913b;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          background: #234723;
          color: #fff;
          padding: 0.8rem 1.1rem;
          font-size: 0.875rem;
          font-weight: 900;
        }
        .btn-primary:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #234723;
          padding: 0.8rem 1.1rem;
          font-size: 0.875rem;
          font-weight: 800;
        }
        .btn-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          background: #d8913b;
          color: #172617;
          padding: 0.8rem 1.1rem;
          font-size: 0.875rem;
          font-weight: 900;
        }
        .btn-gold:hover,
        .btn-primary:hover,
        .btn-secondary:hover {
          opacity: 0.9;
        }
        .th {
          padding: 0.8rem 1rem;
          text-align: left;
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
        }
        .td {
          padding: 1rem;
          color: #475569;
        }
        .summary {
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          background: #f8f9fa;
          padding: 1.25rem;
        }
        .eyebrow {
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #d8913b;
        }
        .summary-title {
          margin-top: 0.35rem;
          font-size: 1.1rem;
          font-weight: 900;
          color: #234723;
        }
        .summary-text {
          margin-top: 0.2rem;
          font-size: 0.85rem;
          color: #64748b;
        }
        .summary-stats {
          display: grid;
          gap: 0.6rem;
          margin-top: 0.6rem;
          font-size: 0.9rem;
          font-weight: 800;
          color: #234723;
        }
      `}</style>
    </div>
  );
}
