'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  LogIn,
  Plus,
  RefreshCw,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';

import Papa from 'papaparse';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';

type Category = 'BOYS' | 'GIRLS';

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

type Pool = {
  id: string;
  name: string;
  tournament_id: string;
};

type Team = {
  id: string;
  name: string;
  city?: string | null;
  province?: string | null;
  tournament_id?: string | null;
  pool_group_id?: string | null;
  participation_type?: ParticipationType;
};

type Match = {
  id: string;
  match_number?: number | null;
  tournament_id?: string | null;
  pool_group_id?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  home_cap_color?: string | null;
  away_cap_color?: string | null;
  status?: string | null;
  pool_location?: string | null;
  scheduled_time?: string | null;
  round_type?: string | null;
  stage_type?: string | null;
  stage_name?: string | null;
  stage_order?: number | null;
  home_team?: {
    name?: string | null;
  } | null;
  away_team?: {
    name?: string | null;
  } | null;
  pool_group?: {
    name?: string | null;
  } | null;
};

type FixtureRow = {
  tournament_name: string;
  match_number: number;
  pool: string;
  scheduled_time: string;
  home_team: string;
  away_team: string;
  home_cap_color: 'white' | 'blue' | 'dark';
  away_cap_color: 'white' | 'blue' | 'dark';
  pool_location: string;
  round_type: string;
  stage_type: string;
  stage_name: string;
  stage_order: number | null;
};

const VALID_CAP_COLORS = ['white', 'blue', 'dark'] as const;

const PARTICIPATION_OPTIONS: {
  value: ParticipationType;
  label: string;
}[] = [
  {
    value: 'STANDARD',
    label: 'Standard',
  },
  {
    value: 'INVITATIONAL',
    label: 'Invitational',
  },
  {
    value: 'EXHIBITION',
    label: 'Exhibition',
  },
];

function normaliseString(value: unknown): string {
  return String(value ?? '').trim();
}

function normaliseParticipationType(value: unknown): ParticipationType {
  const normalised = normaliseString(value).toUpperCase();
  if (normalised === 'INVITATIONAL') {
    return 'INVITATIONAL';
  }
  if (normalised === 'EXHIBITION') {
    return 'EXHIBITION';
  }
  return 'STANDARD';
}

function normaliseCapColor(
  value: unknown,
  fallback: 'white' | 'blue' | 'dark'
): 'white' | 'blue' | 'dark' {
  const normalised = normaliseString(value).toLowerCase();
  return VALID_CAP_COLORS.includes(normalised as 'white' | 'blue' | 'dark')
    ? (normalised as 'white' | 'blue' | 'dark')
    : fallback;
}
function formatParticipationType(value: ParticipationType): string {
  switch (value) {
    case 'INVITATIONAL':
      return 'Invitational';
    case 'EXHIBITION':
      return 'Exhibition';

    default:
      return 'Standard';
  }
}
function participationClasses(value: ParticipationType): string {
  switch (value) {
    case 'INVITATIONAL':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'EXHIBITION':
      return 'border-slate-200 bg-slate-100 text-slate-600';

    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}
function parseSpreadsheetDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString();
  }
  const text = normaliseString(value);
  if (!text) {
    return null;
  }
  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (directMatch) {
    const [, year, month, day, hour, minute] = directMatch;
    const date = new Date(`${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute}:00+02:00`);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}
function createFixtureFromRow(row: Record<string, unknown>): FixtureRow {
  const rawMatchNumber = normaliseString(row.match_number);
  const rawStageOrder = normaliseString(row.stage_order);
  const stageOrder = rawStageOrder ? Number(rawStageOrder) : null;
  return {
    tournament_name: normaliseString(row.tournament_name),
    match_number: Number(rawMatchNumber || 0),
    pool: normaliseString(row.pool),
    scheduled_time: normaliseString(row.scheduled_time),
    home_team: normaliseString(row.home_team),
    away_team: normaliseString(row.away_team),
    home_cap_color: normaliseCapColor(row.home_cap_color, 'white'),
    away_cap_color: normaliseCapColor(row.away_cap_color, 'blue'),
    pool_location: normaliseString(row.pool_location),
    round_type: normaliseString(row.round_type) || 'Pool',
    stage_type: normaliseString(row.stage_type) || 'POOL',
    stage_name: normaliseString(row.stage_name),
    stage_order: Number.isFinite(stageOrder) ? stageOrder : null,
  };
}
function validateFixture(fixture: FixtureRow): string[] {
  const errors: string[] = [];
  if (!fixture.tournament_name) {
    errors.push('Tournament name is missing.');
  }
  if (!Number.isFinite(fixture.match_number) || fixture.match_number <= 0) {
    errors.push('Match number must be a positive number.');
  }
  if (!fixture.pool) {
    errors.push('Pool is missing.');
  }
  if (!fixture.home_team) {
    errors.push('Home team is missing.');
  }
  if (!fixture.away_team) {
    errors.push('Away team is missing.');
  }
  if (
    fixture.home_team &&
    fixture.away_team &&
    fixture.home_team.toLowerCase() === fixture.away_team.toLowerCase()
  ) {
    errors.push('Home and away teams cannot be the same.');
  }
  if (!fixture.scheduled_time) {
    errors.push('Scheduled time is missing.');
  } else if (!parseSpreadsheetDate(fixture.scheduled_time)) {
    errors.push('Scheduled time could not be parsed.');
  }
  return errors;
}
function formatDate(value?: string | null): string {
  if (!value) {
    return 'Not set';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not scheduled';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
function statusClasses(status?: string | null): string {
  const value = normaliseString(status).toUpperCase();
  if (value === 'LIVE' || value === 'IN_PROGRESS' || value === 'RUNNING') {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  if (value === 'COMPLETED' || value === 'FINAL' || value === 'FINISHED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-600';
}
function displayStatus(status?: string | null): string {
  const value = normaliseString(status).toUpperCase();
  if (value === 'IN_PROGRESS' || value === 'RUNNING') {
    return 'Live';
  }
  if (value === 'COMPLETED' || value === 'FINAL' || value === 'FINISHED') {
    return 'Completed';
  }
  if (!value) {
    return 'Scheduled';
  }
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}
export default function AdminPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCategory, setTournamentCategory] = useState<Category>('GIRLS');
  const [tournamentStartDate, setTournamentStartDate] = useState('');
  const [tournamentEndDate, setTournamentEndDate] = useState('');
  const [tournamentLocation, setTournamentLocation] = useState('');
  const [poolName, setPoolName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamCity, setTeamCity] = useState('');
  const [teamProvince, setTeamProvince] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [participationType, setParticipationType] = useState<ParticipationType>('STANDARD');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [fixtureDate, setFixtureDate] = useState('');
  const [fixtureTime, setFixtureTime] = useState('');
  const [fixturePoolId, setFixturePoolId] = useState('');
  const [fixturePoolLocation, setFixturePoolLocation] = useState('');
  const [fixtureMatchNumber, setFixtureMatchNumber] = useState('');
  const [fixtureRoundType, setFixtureRoundType] = useState('Pool');
  const [fixtureStageType, setFixtureStageType] = useState('POOL');
  const [fixtureStageName, setFixtureStageName] = useState('');
  const [fixtureStageOrder, setFixtureStageOrder] = useState('');
  const [fixtureHomeCap, setFixtureHomeCap] = useState<'white' | 'blue' | 'dark'>('white');
  const [fixtureAwayCap, setFixtureAwayCap] = useState<'white' | 'blue' | 'dark'>('blue');
  const [fixtureFileName, setFixtureFileName] = useState('');
  const [fixturePreview, setFixturePreview] = useState<FixtureRow[]>([]);
  const [fixtureImportErrors, setFixtureImportErrors] = useState<string[]>([]);
  const [importingFixtures, setImportingFixtures] = useState(false);
  /*

AUTHENTICATION

*/
  const getAccessToken = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('devSignIn') === '1') {
          return 'dev-token';
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      return session?.access_token ?? null;
    } catch (authError) {
      console.error('Failed to get access token:', authError);

      return null;
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const devSignIn = new URLSearchParams(window.location.search).get('devSignIn');

        if (devSignIn === '1') {
          if (mounted) {
            setUser({
              id: 'dev',
              email: 'dev@veldt.local',
            });

            setAuthLoading(false);
          }

          return;
        }

        const { data } = await supabase.auth.getSession();

        if (mounted) {
          setUser(data.session?.user ? (data.session.user as SessionUser) : null);

          setAuthLoading(false);
        }
      } catch (authError) {
        console.error('Failed to load auth session:', authError);

        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ? (session.user as SessionUser) : null);

        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  const signIn = async () => {
    try {
      setError(null);
      setMessage(null);
      const redirectUrl =
        window.location.hostname === 'water-polo-platform.vercel.app'
          ? 'https://water-polo-platform.vercel.app/admin'
          : `${window.location.origin}/admin`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (authError) {
      console.error('GitHub sign-in failed:', authError);

      setError(authError instanceof Error ? authError.message : 'GitHub sign-in failed.');
    }
  };
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (signOutError) {
      console.error('Sign out failed:', signOutError);
    }
  };
  /*

LOAD TOURNAMENTS

*/
  const loadTournaments = useCallback(
    async (preserveSelection = true) => {
      try {
        setLoadingData(true);
        setError(null);
        const { data, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', {
            ascending: false,
          });

        if (tournamentError) {
          throw tournamentError;
        }

        const tournamentRows = (data ?? []) as Tournament[];

        setTournaments(tournamentRows);

        if (
          preserveSelection &&
          selectedTournamentId &&
          tournamentRows.some((tournament) => tournament.id === selectedTournamentId)
        ) {
          return;
        }

        if (tournamentRows.length) {
          setSelectedTournamentId(tournamentRows[0].id);
        } else {
          setSelectedTournamentId('');
        }
      } catch (loadError) {
        console.error('Tournament load failed:', loadError);

        setError(loadError instanceof Error ? loadError.message : 'Failed to load tournaments.');
      } finally {
        setLoadingData(false);
      }
    },
    [selectedTournamentId]
  );
  const loadTournamentData = useCallback(async (tournamentId: string) => {
    if (!tournamentId) {
      setPools([]);
      setTeams([]);
      setMatches([]);
      return;
    }
    try {
      setLoadingData(true);
      setError(null);

      const [poolsResult, tournamentTeamsResult, matchesResult] = await Promise.all([
        supabase
          .from('pool_groups')
          .select('id,name,tournament_id')
          .eq('tournament_id', tournamentId)
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('tournament_teams')
          .select(
            `
              team_id,
              pool_group_id,
              participation_type,
              team:teams(id,name,city,province)
            `
          )
          .eq('tournament_id', tournamentId),

        supabase
          .from('matches')
          .select(
            `
                id,
                match_number,
                tournament_id,
                pool_group_id,
                home_team_id,
                away_team_id,
                home_score,
                away_score,
                home_cap_color,
                away_cap_color,
                status,
                pool_location,
                scheduled_time,
                round_type,
                stage_type,
                stage_name,
                stage_order,
                home_team:teams!matches_home_team_id_fkey(name),
                away_team:teams!matches_away_team_id_fkey(name),
                pool_group:pool_groups(name)
              `
          )
          .eq('tournament_id', tournamentId)
          .order('scheduled_time', {
            ascending: true,
            nullsFirst: false,
          }),

      ]);

      if (poolsResult.error) {
        throw poolsResult.error;
      }

      if (tournamentTeamsResult.error) {
        throw tournamentTeamsResult.error;
      }

      if (matchesResult.error) {
        throw matchesResult.error;
      }

      const teamRows = (tournamentTeamsResult.data ?? [])
        .flatMap((row) => {
          const team = Array.isArray(row.team) ? row.team[0] : row.team;

          if (!team) {
            return [];
          }

          return [
            {
              ...(team as Team),
              tournament_id: tournamentId,
              pool_group_id: row.pool_group_id,
              participation_type: normaliseParticipationType(row.participation_type),
            },
          ];
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setPools((poolsResult.data ?? []) as Pool[]);

      setTeams(teamRows);

      setMatches((matchesResult.data ?? []) as Match[]);
    } catch (loadError) {
      console.error('Tournament data load failed:', loadError);

      setError(loadError instanceof Error ? loadError.message : 'Failed to load tournament data.');
    } finally {
      setLoadingData(false);
    }
  }, []);
  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);
  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentData(selectedTournamentId);
    }
  }, [selectedTournamentId, loadTournamentData]);
  /*

CREATE TOURNAMENT

*/
  const createTournament = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tournamentName.trim()) {
      setError('Tournament name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      const response = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tournamentName.trim(),
          startDate: tournamentStartDate || null,
          endDate: tournamentEndDate || null,
          location: tournamentLocation.trim() || null,
          competitionCategory: tournamentCategory,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to create tournament.');
      }

      setMessage('Tournament created successfully.');

      setTournamentName('');
      setTournamentStartDate('');
      setTournamentEndDate('');
      setTournamentLocation('');

      await loadTournaments(false);

      const createdId = result.tournament?.id ?? result.data?.id ?? '';

      if (createdId) {
        setSelectedTournamentId(createdId);
      }
    } catch (createError) {
      console.error('Create tournament failed:', createError);

      setError(createError instanceof Error ? createError.message : 'Failed to create tournament.');
    } finally {
      setLoading(false);
    }
  };
  /*

CREATE POOL

*/
  const createPool = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId) {
      setError('Select a tournament first.');
      return;
    }

    if (!poolName.trim()) {
      setError('Pool name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      const response = await fetch('/api/admin/pools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tournament_id: selectedTournamentId,
          name: poolName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to create pool.');
      }

      setPoolName('');

      setMessage('Pool created successfully.');

      await loadTournamentData(selectedTournamentId);
    } catch (createError) {
      console.error('Create pool failed:', createError);

      setError(createError instanceof Error ? createError.message : 'Failed to create pool.');
    } finally {
      setLoading(false);
    }
  };
  /*

CREATE / REGISTER TEAM

*/
  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId) {
      setError('Select a tournament first.');
      return;
    }

    if (!teamName.trim()) {
      setError('Team name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teamName.trim(),
          tournamentId: selectedTournamentId,
          poolGroupId: selectedPoolId || null,
          city: teamCity.trim() || null,
          province: teamProvince.trim() || null,
          participationType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to create team.');
      }

      setTeamName('');
      setTeamCity('');
      setTeamProvince('');
      setSelectedPoolId('');
      setParticipationType('STANDARD');

      setMessage('Team added successfully.');

      await loadTournamentData(selectedTournamentId);
    } catch (createError) {
      console.error('Create team failed:', createError);

      setError(createError instanceof Error ? createError.message : 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };
  /*

UPDATE TEAM POOL

*/
  const updateTeamPool = async (teamId: string, poolGroupId: string) => {
    try {
      setError(null);
      setMessage(null);
      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_group_id: poolGroupId || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to update team pool.');
      }

      setMessage('Team pool updated.');

      await loadTournamentData(selectedTournamentId);
    } catch (updateError) {
      console.error('Update team pool failed:', updateError);

      setError(updateError instanceof Error ? updateError.message : 'Failed to update team pool.');
    }
  };
  /*

UPDATE PARTICIPATION TYPE

*/
  const updateParticipationType = async (teamId: string, nextType: ParticipationType) => {
    try {
      setError(null);
      setMessage(null);
      /*
       * Re-use the existing teams endpoint.
       * The endpoint creates or updates the
       * tournament_teams participation record.
       */
      const team = teams.find((item) => item.id === teamId);

      if (!team) {
        throw new Error('Team could not be found.');
      }

      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: team.name,
          tournamentId: selectedTournamentId,
          poolGroupId: team.pool_group_id ?? null,
          city: team.city ?? null,
          province: team.province ?? null,
          participationType: nextType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to update participation type.');
      }

      setMessage('Participation type updated.');

      await loadTournamentData(selectedTournamentId);
    } catch (updateError) {
      console.error('Participation update failed:', updateError);

      setError(
        updateError instanceof Error ? updateError.message : 'Failed to update participation type.'
      );
    }
  };
  /*

SCHEDULE FIXTURE

*/
  const scheduleFixture = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId) {
      setError('Select a tournament first.');
      return;
    }

    if (!homeTeamId || !awayTeamId) {
      setError('Select both home and away teams.');
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError('Home and away teams cannot be the same.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      let scheduledTime: string | null = null;

      if (fixtureDate && fixtureTime) {
        scheduledTime = parseSpreadsheetDate(`${fixtureDate} ${fixtureTime}`);
      }

      const response = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tournament_id: selectedTournamentId,
          pool_group_id: fixturePoolId || null,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_cap_color: fixtureHomeCap,
          away_cap_color: fixtureAwayCap,
          status: 'scheduled',
          scheduled_time: scheduledTime,
          pool_location: fixturePoolLocation.trim() || null,
          match_number: fixtureMatchNumber ? Number(fixtureMatchNumber) : null,
          round_type: fixtureRoundType,
          stage_type: fixtureStageType,
          stage_name: fixtureStageName.trim() || null,
          stage_order: fixtureStageOrder ? Number(fixtureStageOrder) : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to schedule fixture.');
      }

      setHomeTeamId('');
      setAwayTeamId('');
      setFixtureDate('');
      setFixtureTime('');
      setFixturePoolId('');
      setFixturePoolLocation('');
      setFixtureMatchNumber('');
      setFixtureStageName('');
      setFixtureStageOrder('');
      setFixtureRoundType('Pool');
      setFixtureStageType('POOL');
      setFixtureHomeCap('white');
      setFixtureAwayCap('blue');

      setMessage('Fixture scheduled successfully.');

      await loadTournamentData(selectedTournamentId);
    } catch (createError) {
      console.error('Schedule fixture failed:', createError);

      setError(createError instanceof Error ? createError.message : 'Failed to schedule fixture.');
    } finally {
      setLoading(false);
    }
  };
  /*

CSV FIXTURE PREVIEW

*/
  const handleFixtureFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFixtureFileName(file.name);
    setFixtureImportErrors([]);
    setFixturePreview([]);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map(createFixtureFromRow);

        const validationErrors: string[] = [];

        rows.forEach((row, index) => {
          const errors = validateFixture(row);

          errors.forEach((errorMessage) => {
            validationErrors.push(`Row ${index + 2}: ${errorMessage}`);
          });
        });

        setFixturePreview(rows);

        setFixtureImportErrors(validationErrors);
      },
      error: (parseError) => {
        setFixtureImportErrors([parseError.message]);
      },
    });
  };
  /*

IMPORT CSV FIXTURES

*/
  const importFixtures = async () => {
    if (!fixturePreview.length) {
      setError('There are no fixtures to import.');
      return;
    }
    if (fixtureImportErrors.length) {
      setError('Fix the spreadsheet validation errors before importing.');
      return;
    }

    try {
      setImportingFixtures(true);
      setError(null);
      setMessage(null);

      const token = await getAccessToken();

      if (!token) {
        throw new Error('Your login session has expired. Please sign in with GitHub again.');
      }

      let imported = 0;

      for (const fixture of fixturePreview) {
        const tournament = tournaments.find(
          (item) => item.name.trim().toLowerCase() === fixture.tournament_name.trim().toLowerCase()
        );

        if (!tournament) {
          throw new Error(`Tournament "${fixture.tournament_name}" was not found.`);
        }

        const homeTeam = teams.find(
          (team) => team.name.trim().toLowerCase() === fixture.home_team.trim().toLowerCase()
        );

        const awayTeam = teams.find(
          (team) => team.name.trim().toLowerCase() === fixture.away_team.trim().toLowerCase()
        );

        if (!homeTeam || !awayTeam) {
          throw new Error(`Could not find both teams for match ${fixture.match_number}.`);
        }

        const pool = pools.find(
          (item) =>
            item.tournament_id === tournament.id &&
            item.name.trim().toLowerCase() === fixture.pool.trim().toLowerCase()
        );

        const scheduledTime = parseSpreadsheetDate(fixture.scheduled_time);

        const response = await fetch('/api/admin/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tournament_id: tournament.id,
            pool_group_id: pool?.id ?? null,
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            home_cap_color: fixture.home_cap_color,
            away_cap_color: fixture.away_cap_color,
            status: 'scheduled',
            scheduled_time: scheduledTime,
            pool_location: fixture.pool_location || null,
            match_number: fixture.match_number,
            round_type: fixture.round_type,
            stage_type: fixture.stage_type,
            stage_name: fixture.stage_name || null,
            stage_order: fixture.stage_order,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? `Failed to import match ${fixture.match_number}.`);
        }

        imported += 1;
      }

      setMessage(`${imported} fixture${imported === 1 ? '' : 's'} imported successfully.`);

      setFixtureFileName('');
      setFixturePreview([]);
      setFixtureImportErrors([]);

      await loadTournamentData(selectedTournamentId);
    } catch (importError) {
      console.error('Fixture import failed:', importError);

      setError(importError instanceof Error ? importError.message : 'Fixture import failed.');
    } finally {
      setImportingFixtures(false);
    }
  };
  /*

DERIVED DATA

*/
  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [tournaments, selectedTournamentId]
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );
  const poolNameById = useCallback(
    (poolId?: string | null) => pools.find((pool) => pool.id === poolId)?.name ?? 'Unassigned',
    [pools]
  );
  /*

AUTH LOADING

*/
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-soft)]">
        <Header />
        <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="rounded-2xl border border-veldt-border bg-white px-8 py-10 text-center shadow-sm">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-veldt-ochre" />

              <p className="mt-4 font-semibold text-veldt-green">Checking authentication...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  /*

SIGN-IN SCREEN

*/
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-soft)]">
        <Header />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1600px] items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
          <div className="w-full max-w-lg rounded-3xl border border-veldt-border bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-veldt-green/10">
              <Trophy className="h-8 w-8 text-veldt-green" />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-veldt-ochre">
              Veldt Analytics
            </p>

            <h1 className="mt-2 text-3xl font-black text-veldt-green">Admin Access</h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-veldt-muted">
              Sign in with GitHub to create tournaments, manage pools and teams, and prepare
              fixtures for the water polo platform.
            </p>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={signIn}
              className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-veldt-green px-5 py-3.5 text-sm font-black text-white transition hover:opacity-90"
            >
              <LogIn className="h-5 w-5" />
              Sign in with GitHub
            </button>

            <p className="mt-4 text-xs text-slate-400">
              Production login returns to water-polo-platform.vercel.app.
            </p>
          </div>
        </main>
      </div>
    );
  }
  /*

MAIN ADMIN SCREEN

*/
  return (
    <div className="min-h-screen bg-[var(--bg-soft)]">
      <Header />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-veldt-ochre">
              <Trophy className="h-4 w-4" />
              Tournament Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-veldt-green sm:text-4xl">
              Veldt Analytics Admin
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-veldt-muted">
              Create competitions, organise pools, register teams, set participation status and
              prepare fixtures for the scorekeeper.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-veldt-border bg-white px-4 py-3 text-right shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-veldt-ochre">
                Signed in
              </div>

              <div className="mt-1 max-w-[220px] truncate text-sm font-semibold text-veldt-green">
                {user.email ?? user.user_metadata?.user_name?.toString() ?? 'GitHub User'}
              </div>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>

        {(message || error) && (
          <div className="mb-6 space-y-3">
            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-veldt-border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-veldt-ochre">
                Active Tournament
              </div>

              <div className="mt-1 text-lg font-black text-veldt-green">
                {selectedTournament?.name ?? 'No tournament selected'}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                className="min-w-[260px] rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-veldt-ochre"
              >
                {tournaments.length === 0 && <option value="">No tournaments</option>}

                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => loadTournaments()}
                disabled={loadingData}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm font-bold text-veldt-green transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-veldt-green/10">
                <Trophy className="h-5 w-5 text-veldt-green" />
              </div>

              <div>
                <h2 className="text-xl font-black text-veldt-green">Create Tournament</h2>

                <p className="mt-1 text-sm text-veldt-muted">
                  Create the competition that will hold your pools, teams and fixtures.
                </p>
              </div>
            </div>

            <form onSubmit={createTournament} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Tournament Name
                </label>

                <input
                  type="text"
                  value={tournamentName}
                  onChange={(event) => setTournamentName(event.target.value)}
                  placeholder="e.g. Mackenzie Cup 2026"
                  className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Category
                  </label>

                  <select
                    value={tournamentCategory}
                    onChange={(event) => setTournamentCategory(event.target.value as Category)}
                    className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
                  >
                    <option value="GIRLS">Girls</option>

                    <option value="BOYS">Boys</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Location
                  </label>

                  <input
                    type="text"
                    value={tournamentLocation}
                    onChange={(event) => setTournamentLocation(event.target.value)}
                    placeholder="Cape Town"
                    className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={tournamentStartDate}
                    onChange={(event) => setTournamentStartDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={tournamentEndDate}
                    onChange={(event) => setTournamentEndDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-veldt-green px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create Tournament
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-veldt-ochre/10">
                <Layers className="h-5 w-5 text-veldt-ochre" />
              </div>

              <div>
                <h2 className="text-xl font-black text-veldt-green">Create Pool</h2>

                <p className="mt-1 text-sm text-veldt-muted">
                  Add pool groups to the active tournament.
                </p>
              </div>
            </div>

            <form onSubmit={createPool} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Pool Name
                </label>

                <input
                  type="text"
                  value={poolName}
                  onChange={(event) => setPoolName(event.target.value)}
                  placeholder="Pool A"
                  className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !selectedTournamentId}
                className="inline-flex items-center gap-2 rounded-xl bg-veldt-ochre px-5 py-3 text-sm font-black text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Pool
              </button>
            </form>

            <div className="mt-6 border-t border-veldt-border pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Current Pools
                </span>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {pools.length}
                </span>
              </div>

              <div className="space-y-2">
                {pools.map((pool) => (
                  <div
                    key={pool.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span className="font-bold text-veldt-green">{pool.name}</span>
                  </div>
                ))}

                {pools.length === 0 && (
                  <p className="text-sm text-slate-400">No pools created yet.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-veldt-green/10">
                <Users className="h-5 w-5 text-veldt-green" />
              </div>

              <div>
                <h2 className="text-xl font-black text-veldt-green">Register Team</h2>

                <p className="mt-1 text-sm text-veldt-muted">
                  Add teams to the selected tournament and classify their tournament participation.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Registered Teams
              </div>

              <div className="text-lg font-black text-veldt-green">{teams.length}</div>
            </div>
          </div>

          <form onSubmit={createTeam} className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Team Name
              </label>

              <input
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="St Stithians College"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                City
              </label>

              <input
                type="text"
                value={teamCity}
                onChange={(event) => setTeamCity(event.target.value)}
                placeholder="Johannesburg"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Province
              </label>

              <input
                type="text"
                value={teamProvince}
                onChange={(event) => setTeamProvince(event.target.value)}
                placeholder="Gauteng"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Pool
              </label>

              <select
                value={selectedPoolId}
                onChange={(event) => setSelectedPoolId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
              >
                <option value="">Unassigned</option>

                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Participation
              </label>

              <select
                value={participationType}
                onChange={(event) => setParticipationType(event.target.value as ParticipationType)}
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm outline-none focus:border-veldt-ochre"
              >
                {PARTICIPATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !selectedTournamentId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-veldt-green px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Team
              </button>
            </div>
          </form>

          <div className="mt-7 overflow-x-auto rounded-2xl border border-veldt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Team
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Location
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Pool
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Participation
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-veldt-border">
                {sortedTeams.map((team) => {
                  const participation = normaliseParticipationType(team.participation_type);

                  return (
                    <tr key={team.id}>
                      <td className="px-4 py-4">
                        <div className="font-bold text-veldt-green">{team.name}</div>
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {[team.city, team.province].filter(Boolean).join(', ') || 'Not set'}
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={team.pool_group_id ?? ''}
                          onChange={(event) => updateTeamPool(team.id, event.target.value)}
                          className="rounded-lg border border-veldt-border bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Unassigned</option>

                          {pools.map((pool) => (
                            <option key={pool.id} value={pool.id}>
                              {pool.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <span
                            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${participationClasses(
                              participation
                            )}`}
                          >
                            {formatParticipationType(participation)}
                          </span>

                          <select
                            value={participation}
                            onChange={(event) =>
                              updateParticipationType(
                                team.id,
                                event.target.value as ParticipationType
                              )
                            }
                            className="rounded-lg border border-veldt-border bg-white px-3 py-2 text-xs"
                          >
                            {PARTICIPATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {sortedTeams.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                      No teams registered for this tournament yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-veldt-ochre/10">
              <Calendar className="h-5 w-5 text-veldt-ochre" />
            </div>

            <div>
              <h2 className="text-xl font-black text-veldt-green">Schedule Fixture</h2>

              <p className="mt-1 text-sm text-veldt-muted">
                Create an individual fixture for the active tournament.
              </p>
            </div>
          </div>

          <form onSubmit={scheduleFixture} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Match Number
              </label>

              <input
                type="number"
                min="1"
                value={fixtureMatchNumber}
                onChange={(event) => setFixtureMatchNumber(event.target.value)}
                placeholder="1"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Pool
              </label>

              <select
                value={fixturePoolId}
                onChange={(event) => setFixturePoolId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm"
              >
                <option value="">Unassigned</option>

                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Home Team
              </label>

              <select
                value={homeTeamId}
                onChange={(event) => setHomeTeamId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm"
              >
                <option value="">Select team</option>

                {sortedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Away Team
              </label>

              <select
                value={awayTeamId}
                onChange={(event) => setAwayTeamId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm"
              >
                <option value="">Select team</option>

                {sortedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Date
              </label>

              <input
                type="date"
                value={fixtureDate}
                onChange={(event) => setFixtureDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Time
              </label>

              <input
                type="time"
                value={fixtureTime}
                onChange={(event) => setFixtureTime(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Pool Location
              </label>

              <input
                type="text"
                value={fixturePoolLocation}
                onChange={(event) => setFixturePoolLocation(event.target.value)}
                placeholder="Pool 1"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Round Type
              </label>

              <select
                value={fixtureRoundType}
                onChange={(event) => setFixtureRoundType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm"
              >
                <option value="Pool">Pool</option>

                <option value="Quarter-final">Quarter-final</option>

                <option value="Semi-final">Semi-final</option>

                <option value="Final">Final</option>

                <option value="3rd Place">3rd Place</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Stage Type
              </label>

              <input
                type="text"
                value={fixtureStageType}
                onChange={(event) => setFixtureStageType(event.target.value)}
                placeholder="POOL"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Stage Name
              </label>

              <input
                type="text"
                value={fixtureStageName}
                onChange={(event) => setFixtureStageName(event.target.value)}
                placeholder="Pool Stage"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Stage Order
              </label>

              <input
                type="number"
                value={fixtureStageOrder}
                onChange={(event) => setFixtureStageOrder(event.target.value)}
                placeholder="1"
                className="mt-2 w-full rounded-xl border border-veldt-border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Home Cap
              </label>

              <select
                value={fixtureHomeCap}
                onChange={(event) =>
                  setFixtureHomeCap(event.target.value as 'white' | 'blue' | 'dark')
                }
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm"
              >
                <option value="white">White</option>

                <option value="blue">Blue</option>

                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Away Cap
              </label>

              <select
                value={fixtureAwayCap}
                onChange={(event) =>
                  setFixtureAwayCap(event.target.value as 'white' | 'blue' | 'dark')
                }
                className="mt-2 w-full rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm"
              >
                <option value="blue">Blue</option>

                <option value="white">White</option>

                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={loading || !selectedTournamentId || !homeTeamId || !awayTeamId}
                className="inline-flex items-center gap-2 rounded-xl bg-veldt-green px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Schedule Fixture
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <FileSpreadsheet className="h-5 w-5 text-veldt-green" />
              </div>

              <div>
                <h2 className="text-xl font-black text-veldt-green">Import Fixtures</h2>

                <p className="mt-1 text-sm text-veldt-muted">
                  Upload a CSV spreadsheet using the Veldt fixture structure.
                </p>
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-veldt-border bg-white px-4 py-3 text-sm font-bold text-veldt-green transition hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Choose CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFixtureFile}
                className="hidden"
              />
            </label>
          </div>

          {fixtureFileName && (
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="font-bold text-veldt-green">File:</span> {fixtureFileName}
            </div>
          )}

          {fixtureImportErrors.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="font-bold text-red-800">Spreadsheet validation errors</div>

              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-red-700">
                {fixtureImportErrors.map((importError, index) => (
                  <div key={`${importError}-${index}`}>{importError}</div>
                ))}
              </div>
            </div>
          )}

          {fixturePreview.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-black text-veldt-green">Fixture Preview</div>

                  <div className="text-sm text-slate-500">
                    {fixturePreview.length} rows detected
                  </div>
                </div>

                <button
                  type="button"
                  onClick={importFixtures}
                  disabled={importingFixtures || fixtureImportErrors.length > 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-veldt-ochre px-4 py-3 text-sm font-black text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />

                  {importingFixtures ? 'Importing...' : 'Import Fixtures'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-veldt-border">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-black uppercase tracking-wider text-slate-500">
                        #
                      </th>

                      <th className="px-3 py-3 text-left font-black uppercase tracking-wider text-slate-500">
                        Pool
                      </th>

                      <th className="px-3 py-3 text-left font-black uppercase tracking-wider text-slate-500">
                        Date/Time
                      </th>

                      <th className="px-3 py-3 text-left font-black uppercase tracking-wider text-slate-500">
                        Home
                      </th>

                      <th className="px-3 py-3 text-left font-black uppercase tracking-wider text-slate-500">
                        Away
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-veldt-border">
                    {fixturePreview.slice(0, 25).map((fixture, index) => (
                      <tr key={`${fixture.match_number}-${index}`}>
                        <td className="px-3 py-3 font-bold text-veldt-green">
                          {fixture.match_number}
                        </td>

                        <td className="px-3 py-3">{fixture.pool}</td>

                        <td className="px-3 py-3">{fixture.scheduled_time}</td>

                        <td className="px-3 py-3 font-semibold">{fixture.home_team}</td>

                        <td className="px-3 py-3 font-semibold">{fixture.away_team}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {fixturePreview.length > 25 && (
                <p className="mt-3 text-xs text-slate-400">
                  Showing the first 25 rows of the preview.
                </p>
              )}
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-veldt-green">Current Fixtures</h2>

              <p className="mt-1 text-sm text-veldt-muted">
                Fixtures registered for the active tournament.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-veldt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Match
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Fixture
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Pool
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Scheduled
                  </th>

                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-veldt-border">
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td className="px-4 py-4 font-black text-veldt-green">
                      {match.match_number ?? '—'}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">
                        {match.home_team?.name ?? 'Unknown Home Team'}
                      </div>

                      <div className="my-1 text-xs font-black uppercase tracking-wider text-slate-400">
                        vs
                      </div>

                      <div className="font-bold text-slate-800">
                        {match.away_team?.name ?? 'Unknown Away Team'}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {match.pool_group?.name ?? poolNameById(match.pool_group_id)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(match.scheduled_time)}

                      {match.pool_location && (
                        <div className="mt-1 text-xs text-slate-400">{match.pool_location}</div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(
                          match.status
                        )}`}
                      >
                        {displayStatus(match.status)}
                      </span>
                    </td>
                  </tr>
                ))}

                {matches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                      No fixtures have been created for this tournament yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedTournament && (
          <section className="mt-6 rounded-2xl border border-veldt-border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-veldt-ochre">
                  Active Competition
                </div>

                <h2 className="mt-1 text-2xl font-black text-veldt-green">
                  {selectedTournament.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedTournament.competition_category === 'BOYS' ? 'Boys' : 'Girls'}{' '}
                  competition
                  {selectedTournament.location ? ` · ${selectedTournament.location}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <div className="text-lg font-black text-veldt-green">{pools.length}</div>

                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Pools
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <div className="text-lg font-black text-veldt-green">{teams.length}</div>

                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Teams
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <div className="text-lg font-black text-veldt-green">{matches.length}</div>

                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Fixtures
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {['STANDARD', 'INVITATIONAL', 'EXHIBITION'].map((type) => {
                const count = teams.filter(
                  (team) => normaliseParticipationType(team.participation_type) === type
                ).length;

                return (
                  <span
                    key={type}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${participationClasses(
                      type as ParticipationType
                    )}`}
                  >
                    {formatParticipationType(type as ParticipationType)}: {count}
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
