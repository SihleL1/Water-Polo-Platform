'use client';
import React, {
useEffect,
useMemo,
useState,
} from 'react';
import Papa from 'papaparse';
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
import Header from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';
type Category =
| 'BOYS'
| 'GIRLS';
type ParticipationType =
| 'STANDARD'
| 'INVITATIONAL'
| 'EXHIBITION';
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
type SessionUser = {
id: string;
email?: string | null;
user_metadata?: Record<string, unknown>;
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
const VALID_CAP_COLORS = [
'white',
'blue',
'dark',
] as const;
function normaliseString(
value: unknown
): string {
return String(
value ?? ''
).trim();
}
function normaliseParticipationType(
value: unknown
): ParticipationType {
const normalized =
normaliseString(
value
).toUpperCase();
if (
normalized ===
'INVITATIONAL'
) {
return 'INVITATIONAL';
}
if (
normalized ===
'EXHIBITION'
) {
return 'EXHIBITION';
}
return 'STANDARD';
}
function normaliseCapColor(
value: unknown,
fallback: 'white' | 'blue' | 'dark'
): 'white' | 'blue' | 'dark' {
const normalized =
normaliseString(
value
).toLowerCase();
return VALID_CAP_COLORS.includes(
normalized as
| 'white'
| 'blue'
| 'dark'
)
? (normalized as
| 'white'
| 'blue'
| 'dark')
: fallback;
}
function formatParticipationType(
value: ParticipationType
) {
switch (value) {
case 'INVITATIONAL':
return 'Invitational';
case 'EXHIBITION':
  return 'Exhibition';

default:
  return 'Standard';
}
}
function participationClasses(
value: ParticipationType
) {
switch (value) {
case 'INVITATIONAL':
return 'bg-amber-100 text-amber-700 border-amber-200';
case 'EXHIBITION':
  return 'bg-slate-100 text-slate-600 border-slate-200';

default:
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}
}
function parseSpreadsheetDate(
value: unknown
): string | null {
const text =
normaliseString(value);
if (!text) {
return null;
}
/*
Preferred format:

YYYY-MM-DD HH

Example:
2026-10-03 08:30
*/
const directMatch =
text.match(
/^(\d{4})-(\d{2})-(\d{2}) T:(\d{2})$/
);
if (directMatch) {
const [
,
year,
month,
day,
hour,
minute,
] = directMatch;
const date =
  new Date(
    `${year}-${month}-${day}T${hour.padStart(
      2,
      '0'
    )}:${minute}:00+02:00`
  );

if (
  !Number.isNaN(
    date.getTime()
  )
) {
  return date.toISOString();
}
}
/*
Handle Excel/JavaScript style dates.
*/
const parsed =
new Date(text);
if (
!Number.isNaN(
parsed.getTime()
)
) {
return parsed.toISOString();
}
return null;
}
function createFixtureFromRow(
row: Record<string, unknown>
): FixtureRow {
const rawMatchNumber =
normaliseString(
row.match_number
);
const rawStageOrder =
normaliseString(
row.stage_order
);
const stageOrder =
rawStageOrder
? Number(
rawStageOrder
)
: null;
return {
tournament_name:
normaliseString(
row.tournament_name
),
match_number:
  Number(
    rawMatchNumber || 0
  ),

pool:
  normaliseString(
    row.pool
  ),

scheduled_time:
  normaliseString(
    row.scheduled_time
  ),

home_team:
  normaliseString(
    row.home_team
  ),

away_team:
  normaliseString(
    row.away_team
  ),

home_cap_color:
  normaliseCapColor(
    row.home_cap_color,
    'white'
  ),

away_cap_color:
  normaliseCapColor(
    row.away_cap_color,
    'blue'
  ),

pool_location:
  normaliseString(
    row.pool_location
  ),

round_type:
  normaliseString(
    row.round_type
  ) || 'Pool',

stage_type:
  normaliseString(
    row.stage_type
  ) || 'POOL',

stage_name:
  normaliseString(
    row.stage_name
  ),

stage_order:
  Number.isFinite(
    stageOrder
  )
    ? stageOrder
    : null,
};
}
function validateFixture(
fixture: FixtureRow
) {
const errors: string[] = [];
if (
!fixture.tournament_name
) {
errors.push(
'Tournament name is missing.'
);
}
if (
!Number.isFinite(
fixture.match_number
) ||
fixture.match_number <= 0
) {
errors.push(
'Match number must be a positive number.'
);
}
if (
!fixture.home_team
) {
errors.push(
'Home team is missing.'
);
}
if (
!fixture.away_team
) {
errors.push(
'Away team is missing.'
);
}
if (
fixture.home_team &&
fixture.away_team &&
fixture.home_team.toLowerCase() ===
fixture.away_team.toLowerCase()
) {
errors.push(
'Home and away teams cannot be the same.'
);
}
if (
!fixture.scheduled_time
) {
errors.push(
'Scheduled time is missing.'
);
} else if (
!parseSpreadsheetDate(
fixture.scheduled_time
)
) {
errors.push(
'Scheduled time could not be parsed.'
);
}
return errors;
}
export default function AdminPage() {
const [user, setUser] =
useState<SessionUser | null>(
null
);
const [authLoading, setAuthLoading] =
useState(true);
const [tournaments, setTournaments] =
useState<Tournament[]>([]);
const [selectedTournamentId, setSelectedTournamentId] =
useState<string>('');
const [pools, setPools] =
useState<Pool[]>([]);
const [teams, setTeams] =
useState<Team[]>([]);
const [matches, setMatches] =
useState<Match[]>([]);
const [loading, setLoading] =
useState(false);
const [loadingData, setLoadingData] =
useState(false);
const [message, setMessage] =
useState<string | null>(null);
const [error, setError] =
useState<string | null>(null);
// Tournament form
const [tournamentName, setTournamentName] =
useState('');
const [tournamentCategory, setTournamentCategory] =
useState<Category>('GIRLS');
const [tournamentStartDate, setTournamentStartDate] =
useState('');
const [tournamentEndDate, setTournamentEndDate] =
useState('');
const [tournamentLocation, setTournamentLocation] =
useState('');
// Pool form
const [poolName, setPoolName] =
useState('');
// Team form
const [teamName, setTeamName] =
useState('');
const [teamCity, setTeamCity] =
useState('');
const [teamProvince, setTeamProvince] =
useState('');
const [selectedPoolId, setSelectedPoolId] =
useState('');
const [participationType, setParticipationType] =
useState<ParticipationType>(
'STANDARD'
);
// Fixture form
const [homeTeamId, setHomeTeamId] =
useState('');
const [awayTeamId, setAwayTeamId] =
useState('');
const [fixtureDate, setFixtureDate] =
useState('');
const [fixtureTime, setFixtureTime] =
useState('');
const [fixturePoolId, setFixturePoolId] =
useState('');
const [fixturePoolLocation, setFixturePoolLocation] =
useState('');
const [fixtureMatchNumber, setFixtureMatchNumber] =
useState('');
const [fixtureRoundType, setFixtureRoundType] =
useState('Pool');
const [fixtureStageType, setFixtureStageType] =
useState('POOL');
const [fixtureStageName, setFixtureStageName] =
useState('');
const [fixtureStageOrder, setFixtureStageOrder] =
useState('');
const [fixtureHomeCap, setFixtureHomeCap] =
useState<'white' | 'blue' | 'dark'>(
'white'
);
const [fixtureAwayCap, setFixtureAwayCap] =
useState<'white' | 'blue' | 'dark'>(
'blue'
);
const [fixtureFileName, setFixtureFileName] =
useState('');
const [fixturePreview, setFixturePreview] =
useState<FixtureRow[]>([]);
const [fixtureImportErrors, setFixtureImportErrors] =
useState<string[]>([]);
const [importingFixtures, setImportingFixtures] =
useState(false);
const selectedTournament =
useMemo(
() =>
tournaments.find(
(tournament) =>
tournament.id ===
selectedTournamentId
) ?? null,
[
tournaments,
selectedTournamentId,
]
);
const sortedTeams =
useMemo(
() =>
[...teams].sort(
(a, b) =>
a.name.localeCompare(
b.name
)
),
[teams]
);
/*
=========================================================
AUTH
=========================================================
*/
useEffect(() => {
let mounted = true;
const loadSession =
  async () => {
    try {
      const devSignIn =
        new URLSearchParams(
          window.location.search
        ).get(
          'devSignIn'
        );

      if (
        devSignIn === '1'
      ) {
        if (mounted) {
          setUser({
            id: 'dev',
            email:
              'dev@veldt.local',
          });

          setAuthLoading(
            false
          );
        }

        return;
      }

      const {
        data,
      } =
        await supabase.auth.getSession();

      if (
        mounted
      ) {
        setUser(
          data.session
            ?.user
            ? (data.session
                .user as SessionUser)
            : null
        );

        setAuthLoading(
          false
        );
      }
    } catch (authError) {
      console.error(
        'Failed to load auth session:',
        authError
      );

      if (mounted) {
        setAuthLoading(
          false
        );
      }
    }
  };

loadSession();

const {
  data: authListener,
} =
  supabase.auth.onAuthStateChange(
    (
      _event,
      session
    ) => {
      if (
        mounted
      ) {
        setUser(
          session?.user
            ? (session.user as SessionUser)
            : null
        );

        setAuthLoading(
          false
        );
      }
    }
  );

return () => {
  mounted = false;

  authListener.subscription.unsubscribe();
};
}, []);
const signIn = async () => {
  setError(null);

  const isProduction =
    window.location.hostname === 'water-polo-platform.vercel.app';

  const redirectUrl = isProduction
    ? 'https://water-polo-platform.vercel.app/admin'
    : `${window.location.origin}/admin`;

  const {
    error: authError,
  } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (authError) {
    setError(authError.message);
  }
};
/*
=========================================================
LOAD DATA
=========================================================
*/
const loadTournaments =
async (
preserveSelection = true
) => {
try {
setLoadingData(
true
);
setError(null);
    const {
      data,
      error: tournamentError,
    } =
      await supabase
        .from('tournaments')
        .select('*')
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

    if (
      tournamentError
    ) {
      throw tournamentError;
    }

    const tournamentRows =
      (data ??
        []) as Tournament[];

    setTournaments(
      tournamentRows
    );

    if (
      preserveSelection &&
      selectedTournamentId &&
      tournamentRows.some(
        (tournament) =>
          tournament.id ===
          selectedTournamentId
      )
    ) {
      return;
    }

    if (
      tournamentRows.length
    ) {
      setSelectedTournamentId(
        tournamentRows[0].id
      );
    } else {
      setSelectedTournamentId(
        ''
      );
    }
  } catch (loadError) {
    console.error(
      'Tournament load failed:',
      loadError
    );

    setError(
      loadError instanceof Error
        ? loadError.message
        : 'Failed to load tournaments.'
    );
  } finally {
    setLoadingData(
      false
    );
  }
};
const loadTournamentData =
async (
tournamentId: string
) => {
if (
!tournamentId
) {
setPools([]);
setTeams([]);
setMatches([]);
return;
}
  try {
    setLoadingData(
      true
    );
    setError(null);

    const [
      poolsResult,
      teamsResult,
      matchesResult,
      participationResult,
    ] =
      await Promise.all([
        supabase
          .from(
            'pool_groups'
          )
          .select(
            'id,name,tournament_id'
          )
          .eq(
            'tournament_id',
            tournamentId
          )
          .order(
            'name',
            {
              ascending:
                true,
            }
          ),

        supabase
          .from('teams')
          .select(
            'id,name,city,province,tournament_id,pool_group_id'
          )
          .eq(
            'tournament_id',
            tournamentId
          )
          .order(
            'name',
            {
              ascending:
                true,
            }
          ),

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
              home_team:teams!matches_home_team_id_fkey(
                name
              ),
              away_team:teams!matches_away_team_id_fkey(
                name
              ),
              pool_group:pool_groups(
                name
              )
            `
          )
          .eq(
            'tournament_id',
            tournamentId
          )
          .order(
            'scheduled_time',
            {
              ascending:
                true,
              nullsFirst:
                false,
            }
          ),

        supabase
          .from(
            'tournament_teams'
          )
          .select(
            'team_id,participation_type'
          )
          .eq(
            'tournament_id',
            tournamentId
          ),
      ]);

    if (
      poolsResult.error
    ) {
      throw poolsResult.error;
    }

    if (
      teamsResult.error
    ) {
      throw teamsResult.error;
    }

    if (
      matchesResult.error
    ) {
      throw matchesResult.error;
    }

    if (
      participationResult.error
    ) {
      throw participationResult.error;
    }

    const participationMap =
      new Map<
        string,
        ParticipationType
      >();

    for (
      const row of
        participationResult.data ??
        []
    ) {
      participationMap.set(
        row.team_id,
        normaliseParticipationType(
          row.participation_type
        )
      );
    }

    const teamRows =
      (
        (teamsResult.data ??
          []) as Team[]
      ).map(
        (team) => ({
          ...team,
          participation_type:
            participationMap.get(
              team.id
            ) ??
            'STANDARD',
        })
      );

    setPools(
      (poolsResult.data ??
        []) as Pool[]
    );

    setTeams(
      teamRows
    );

    setMatches(
      (matchesResult.data ??
        []) as Match[]
    );

    if (
      fixturePoolId &&
      !(poolsResult.data ??
        []).some(
        (pool) =>
          pool.id ===
          fixturePoolId
      )
    ) {
      setFixturePoolId(
        ''
      );
    }
  } catch (loadError) {
    console.error(
      'Tournament data load failed:',
      loadError
    );

    setError(
      loadError instanceof Error
        ? loadError.message
        : 'Failed to load tournament data.'
    );
  } finally {
    setLoadingData(
      false
    );
  }
};
useEffect(() => {
loadTournaments();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
useEffect(() => {
if (
selectedTournamentId
) {
loadTournamentData(
selectedTournamentId
);
}
}, [
selectedTournamentId,
]);
/*
=========================================================
CREATE TOURNAMENT
=========================================================
*/
const createTournament =
async () => {
if (
!tournamentName.trim()
) {
setError(
'Tournament name is required.'
);
return;
}
  try {
    setLoading(
      true
    );
    setError(null);
    setMessage(null);

    const response =
      await fetch(
        '/api/admin/tournaments',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name:
              tournamentName.trim(),
            startDate:
              tournamentStartDate ||
              null,
            endDate:
              tournamentEndDate ||
              null,
            location:
              tournamentLocation.trim() ||
              null,
            competitionCategory:
              tournamentCategory,
          }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          'Failed to create tournament.'
      );
    }

    setMessage(
      'Tournament created successfully.'
    );

    setTournamentName(
      ''
    );

    setTournamentStartDate(
      ''
    );

    setTournamentEndDate(
      ''
    );

    setTournamentLocation(
      ''
    );

    await loadTournaments(
      false
    );
    
    if (
      result.tournament?.id
    ) {
      setSelectedTournamentId(
        result.tournament.id
      );
    }
  } catch (createError) {
    console.error(
      'Create tournament failed:',
      createError
    );

    setError(
      createError instanceof Error
        ? createError.message
        : 'Failed to create tournament.'
    );
  } finally {
    setLoading(
      false
    );
  }
};
/*
=========================================================
CREATE POOL
=========================================================
*/
const createPool =
async () => {
if (
!selectedTournamentId
) {
setError(
'Select a tournament first.'
);
return;
}
  if (
    !poolName.trim()
  ) {
    setError(
      'Pool name is required.'
    );
    return;
  }

  try {
    setLoading(
      true
    );
    setError(null);
    setMessage(null);

    const response =
      await fetch(
        '/api/admin/pools',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name:
              poolName.trim(),
            tournamentId:
              selectedTournamentId,
          }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          'Failed to create pool.'
      );
    }

    setPoolName(
      ''
    );

    setMessage(
      'Pool created successfully.'
    );

    await loadTournamentData(
      selectedTournamentId
    );
  } catch (createError) {
    console.error(
      'Create pool failed:',
      createError
    );

    setError(
      createError instanceof Error
        ? createError.message
        : 'Failed to create pool.'
    );
  } finally {
    setLoading(
      false
    );
  }
};
/*
=========================================================
CREATE TEAM
=========================================================
*/
const createTeam =
async () => {
if (
!selectedTournamentId
) {
setError(
'Select a tournament first.'
);
return;
}
  if (
    !teamName.trim()
  ) {
    setError(
      'Team name is required.'
    );
    return;
  }

  try {
    setLoading(
      true
    );
    setError(null);
    setMessage(null);

    const response =
      await fetch(
        '/api/admin/teams',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name:
              teamName.trim(),
            tournamentId:
              selectedTournamentId,
            poolGroupId:
              selectedPoolId ||
              null,
            city:
              teamCity.trim() ||
              null,
            province:
              teamProvince.trim() ||
              null,
            participationType,
          }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          'Failed to create team.'
      );
    }

    setTeamName(
      ''
    );

    setTeamCity(
      ''
    );

    setTeamProvince(
      ''
    );

    setSelectedPoolId(
      ''
    );

    setParticipationType(
      'STANDARD'
    );

    setMessage(
      `${formatParticipationType(
        participationType
      )} team added successfully.`
    );

    await loadTournamentData(
      selectedTournamentId
    );
  } catch (createError) {
    console.error(
      'Create team failed:',
      createError
    );

    setError(
      createError instanceof Error
        ? createError.message
        : 'Failed to create team.'
    );
  } finally {
    setLoading(
      false
    );
  }
};
/*
=========================================================
UPDATE TEAM PARTICIPATION
=========================================================
*/
const updateParticipation =
async (
teamId: string,
nextParticipation:
ParticipationType
) => {
if (
!selectedTournamentId
) {
return;
}
  try {
    setError(null);

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          'tournament_teams'
        )
        .update({
          participation_type:
            nextParticipation,
        })
        .eq(
          'tournament_id',
          selectedTournamentId
        )
        .eq(
          'team_id',
          teamId
        );

    if (
      updateError
    ) {
      throw updateError;
    }

    setTeams(
      (current) =>
        current.map(
          (team) =>
            team.id ===
            teamId
              ? {
                  ...team,
                  participation_type:
                    nextParticipation,
                }
              : team
        )
    );

    setMessage(
      'Team participation updated.'
    );
  } catch (updateError) {
    console.error(
      'Participation update failed:',
      updateError
    );

    setError(
      updateError instanceof Error
        ? updateError.message
        : 'Failed to update team participation.'
    );
  }
};
/*
=========================================================
ASSIGN TEAM TO POOL
=========================================================
*/
const updateTeamPool =
async (
teamId: string,
poolGroupId:
string | null
) => {
try {
setError(null);
    const response =
      await fetch(
        `/api/admin/teams/${teamId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            poolGroupId,
            tournamentId:
              selectedTournamentId,
          }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          'Failed to update team pool.'
      );
    }

    setTeams(
      (current) =>
        current.map(
          (team) =>
            team.id ===
            teamId
              ? {
                  ...team,
                  pool_group_id:
                    poolGroupId,
                }
              : team
        )
    );

    setMessage(
      'Team pool updated.'
    );
  } catch (updateError) {
    console.error(
      'Team pool update failed:',
      updateError
    );

    setError(
      updateError instanceof Error
        ? updateError.message
        : 'Failed to update team pool.'
    );
  }
};
/*
=========================================================
CREATE SINGLE FIXTURE
=========================================================
*/
const createFixture =
async () => {
if (
!selectedTournamentId
) {
setError(
'Select a tournament first.'
);
return;
}
  if (
    !homeTeamId ||
    !awayTeamId
  ) {
    setError(
      'Select both teams.'
    );
    return;
  }

  if (
    homeTeamId ===
    awayTeamId
  ) {
    setError(
      'Home and away teams cannot be the same.'
    );
    return;
  }

  if (
    !fixtureDate ||
    !fixtureTime
  ) {
    setError(
      'Select a date and time.'
    );
    return;
  }

  const combined =
    `${fixtureDate} ${fixtureTime}`;

  const scheduledTime =
    parseSpreadsheetDate(
      combined
    );

  if (
    !scheduledTime
  ) {
    setError(
      'The fixture date/time could not be processed.'
    );
    return;
  }

  try {
    setLoading(
      true
    );
    setError(null);
    setMessage(null);

    const response =
      await fetch(
        '/api/admin/matches',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            tournamentId:
              selectedTournamentId,
            poolGroupId:
              fixturePoolId ||
              null,
            homeTeamId:
              homeTeamId,
            awayTeamId:
              awayTeamId,
            homeCapColor:
              fixtureHomeCap,
            awayCapColor:
              fixtureAwayCap,
            status:
              'SCHEDULED',
            scheduledTime,
            poolLocation:
              fixturePoolLocation.trim() ||
              null,
            matchNumber:
              fixtureMatchNumber
                ? Number(
                    fixtureMatchNumber
                  )
                : null,
            roundType:
              fixtureRoundType ||
              'Pool',
            stageType:
              fixtureStageType ||
              'POOL',
            stageName:
              fixtureStageName.trim() ||
              null,
            stageOrder:
              fixtureStageOrder
                ? Number(
                    fixtureStageOrder
                  )
                : null,
          }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          'Failed to create fixture.'
      );
    }

    setHomeTeamId(
      ''
    );

    setAwayTeamId(
      ''
    );

    setFixtureDate(
      ''
    );

    setFixtureTime(
      ''
    );

    setFixturePoolLocation(
      ''
    );

    setFixtureMatchNumber(
      ''
    );

    setFixtureStageName(
      ''
    );

    setFixtureStageOrder(
      ''
    );

    setMessage(
      'Fixture created successfully.'
    );

    await loadTournamentData(
      selectedTournamentId
    );
  } catch (createError) {
    console.error(
      'Create fixture failed:',
      createError
    );

    setError(
      createError instanceof Error
        ? createError.message
        : 'Failed to create fixture.'
    );
  } finally {
    setLoading(
      false
    );
  }
};
/*
=========================================================
FIXTURE SPREADSHEET PARSER
=========================================================
*/
const handleFixtureFile =
(
event: React.ChangeEvent<HTMLInputElement>
) => {
const file =
event.target
.files?.[0];
  if (!file) {
    return;
  }

  setFixtureFileName(
    file.name
  );

  setFixturePreview(
    []
  );

  setFixtureImportErrors(
    []
  );

  Papa.parse<
    Record<string, unknown>
  >(file, {
    header: true,
    skipEmptyLines:
      true,

    complete: (
      result
    ) => {
      const rows =
        result.data.map(
          createFixtureFromRow
        );

      const errors: string[] =
        [];

      rows.forEach(
        (
          row,
          index
        ) => {
          const rowErrors =
            validateFixture(
              row
            );

          rowErrors.forEach(
            (
              rowError
            ) => {
              errors.push(
                `Row ${
                  index + 2
                }: ${rowError}`
              );
            }
          );
        }
      );

      /*
       * Duplicate match numbers.
       */
      const matchNumbers =
        new Map<
          number,
          number
        >();

      rows.forEach(
        (
          row,
          index
        ) => {
          if (
            row.match_number >
            0
          ) {
            const existing =
              matchNumbers.get(
                row.match_number
              );

            if (
              existing !==
              undefined
            ) {
              errors.push(
                `Rows ${
                  existing + 2
                } and ${
                  index + 2
                } both use match number ${row.match_number}.`
              );
            } else {
              matchNumbers.set(
                row.match_number,
                index
              );
            }
          }
        }
      );

      setFixturePreview(
        rows
      );

      setFixtureImportErrors(
        errors
      );
    },

    error: (
      parseError
    ) => {
      console.error(
        'Fixture CSV parse error:',
        parseError
      );

      setFixtureImportErrors([
        'Could not read the fixture spreadsheet.',
      ]);
    },
  });
};
/*
=========================================================
IMPORT FIXTURES
=========================================================
*/
const importFixtures =
async () => {
if (
!fixturePreview.length
) {
setError(
'Upload a fixture spreadsheet first.'
);
return;
}
  if (
    fixtureImportErrors.length
  ) {
    setError(
      'Fix the spreadsheet errors before importing.'
    );
    return;
  }

  if (
    !selectedTournamentId
  ) {
    setError(
      'Select a tournament first.'
    );
    return;
  }

  try {
    setImportingFixtures(
      true
    );
    setError(null);
    setMessage(null);

    const teamMap =
      new Map<
        string,
        Team
      >();

    teams.forEach(
      (team) => {
        teamMap.set(
          team.name
            .trim()
            .toLowerCase(),
          team
        );
      }
    );

    const poolMap =
      new Map<
        string,
        Pool
      >();

    pools.forEach(
      (pool) => {
        poolMap.set(
          pool.name
            .trim()
            .toLowerCase(),
          pool
        );
      }
    );

    const existingMatchNumbers =
      new Set(
        matches
          .map(
            (match) =>
              match.match_number
          )
          .filter(
            (
              value
            ): value is number =>
              typeof value ===
                'number' &&
              Number.isFinite(
                value
              )
          )
      );

    const rowsToImport: Array<{
      tournamentId: string;
      poolGroupId: string | null;
      homeTeamId: string;
      awayTeamId: string;
      homeCapColor: string;
      awayCapColor: string;
      scheduledTime: string;
      poolLocation: string | null;
      matchNumber: number | null;
      roundType: string;
      stageType: string;
      stageName: string | null;
      stageOrder: number | null;
    }> = [];

    const importErrors: string[] =
      [];

    for (
      let index = 0;
      index <
      fixturePreview.length;
      index +=
        1
    ) {
      const fixture =
        fixturePreview[
          index
        ];

      const home =
        teamMap.get(
          fixture.home_team
            .trim()
            .toLowerCase()
        );

      const away =
        teamMap.get(
          fixture.away_team
            .trim()
            .toLowerCase()
        );

      if (!home) {
        importErrors.push(
          `Row ${
            index + 2
          }: Home team "${fixture.home_team}" does not exist in the selected tournament.`
        );

        continue;
      }

      if (!away) {
        importErrors.push(
          `Row ${
            index + 2
          }: Away team "${fixture.away_team}" does not exist in the selected tournament.`
        );

        continue;
      }

      const pool =
        fixture.pool
          ? poolMap.get(
              fixture.pool
                .trim()
                .toLowerCase()
            )
          : null;

      if (
        fixture.pool &&
        !pool
      ) {
        importErrors.push(
          `Row ${
            index + 2
          }: Pool "${fixture.pool}" does not exist in the selected tournament.`
        );

        continue;
      }

      const scheduledTime =
        parseSpreadsheetDate(
          fixture.scheduled_time
        );

      if (
        !scheduledTime
      ) {
        importErrors.push(
          `Row ${
            index + 2
          }: Invalid scheduled_time "${fixture.scheduled_time}".`
        );

        continue;
      }

      if (
        existingMatchNumbers.has(
          fixture.match_number
        )
      ) {
        importErrors.push(
          `Row ${
            index + 2
          }: Match number ${fixture.match_number} already exists in this tournament.`
        );

        continue;
      }

      rowsToImport.push({
        tournamentId:
          selectedTournamentId,

        poolGroupId:
          pool?.id ??
          null,

        homeTeamId:
          home.id,

        awayTeamId:
          away.id,

        homeCapColor:
          fixture.home_cap_color,

        awayCapColor:
          fixture.away_cap_color,

        scheduledTime,

        poolLocation:
          fixture.pool_location ||
          null,

        matchNumber:
          fixture.match_number ||
          null,

        roundType:
          fixture.round_type ||
          'Pool',

        stageType:
          fixture.stage_type ||
          'POOL',

        stageName:
          fixture.stage_name ||
          null,

        stageOrder:
          fixture.stage_order,
      });

      existingMatchNumbers.add(
        fixture.match_number
      );
    }

    if (
      importErrors.length
    ) {
      setFixtureImportErrors(
        importErrors
      );

      setError(
        'Some fixture rows could not be imported.'
      );

      return;
    }

    let importedCount =
      0;

    for (
      const fixture of
        rowsToImport
    ) {
      const response =
        await fetch(
          '/api/admin/matches',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              tournamentId:
                fixture.tournamentId,

              poolGroupId:
                fixture.poolGroupId,

              homeTeamId:
                fixture.homeTeamId,

              awayTeamId:
                fixture.awayTeamId,

              homeCapColor:
                fixture.homeCapColor,

              awayCapColor:
                fixture.awayCapColor,

              status:
                'SCHEDULED',

              scheduledTime:
                fixture.scheduledTime,

              poolLocation:
                fixture.poolLocation,

              matchNumber:
                fixture.matchNumber,

              roundType:
                fixture.roundType,

              stageType:
                fixture.stageType,

              stageName:
                fixture.stageName,

              stageOrder:
                fixture.stageOrder,
            }),
          }
        );

      const responseBody =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          responseBody.error ??
            `Failed to import match ${fixture.matchNumber}.`
        );
      }

      importedCount +=
        1;
    }

    setFixturePreview(
      []
    );

    setFixtureFileName(
      ''
    );

    setFixtureImportErrors(
      []
    );

    setMessage(
      `${importedCount} fixture${
        importedCount === 1
          ? ''
          : 's'
      } imported successfully.`
    );

    await loadTournamentData(
      selectedTournamentId
    );
  } catch (importError) {
    console.error(
      'Fixture import failed:',
      importError
    );

    setError(
      importError instanceof Error
        ? importError.message
        : 'Fixture import failed.'
    );
  } finally {
    setImportingFixtures(
      false
    );
  }
};
/*
=========================================================
RENDER
=========================================================
*/
if (
authLoading
) {
return (
<div
className="min-h-screen"
style={{
background:
'var(--bg-soft)',
}}
>
<Header />
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
        <RefreshCw
          className="mx-auto animate-spin"
          size={24}
          style={{
            color:
              'var(--veldt-green)',
          }}
        />

        <p className="mt-3 text-sm font-bold text-slate-500">
          Checking admin access...
        </p>
      </div>
    </main>
  </div>
);
}
if (!user) {
return (
<div
className="min-h-screen"
style={{
background:
'var(--bg-soft)',
}}
>
<Header />
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <section className="rounded-[32px] border bg-white p-8 text-center shadow-sm md:p-12">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              'var(--veldt-green)',
          }}
        >
          <Trophy
            size={30}
            className="text-white"
          />
        </div>

        <p
          className="mt-6 text-xs font-black uppercase tracking-[0.2em]"
          style={{
            color:
              'var(--veldt-ochre)',
          }}
        >
          Veldt Analytics
        </p>

        <h1
          className="mt-2 text-3xl font-black md:text-4xl"
          style={{
            color:
              'var(--veldt-green)',
          }}
        >
          Tournament Admin
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
          Sign in to create tournaments, manage
          pools and teams, upload fixtures, and
          prepare the platform for live scoring.
        </p>

        <button
          type="button"
          onClick={
            signIn
          }
          className="mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
          style={{
            background:
              'var(--veldt-green)',
          }}
        >
          <LogIn size={17} />
          Sign in with GitHub
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Development shortcut:{' '}
          <code>
            /admin?devSignIn=1
          </code>
        </p>
      </section>
    </main>
  </div>
);
}
return (
<div
className="min-h-screen"
style={{
background:
'var(--bg-soft)',
color: '#0F172A',
}}
>
<Header />
  <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
    <section className="rounded-[32px] border bg-white p-5 shadow-sm md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                'var(--veldt-ochre)',
            }}
          >
            Tournament Operations
          </p>

          <h1
            className="mt-1 text-3xl font-black md:text-5xl"
            style={{
              color:
                'var(--veldt-green)',
            }}
          >
            Admin
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Set up tournaments, pools, teams and fixtures
            before sending matches to the poolside scorekeeper.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
            {user.email ??
              'Authenticated'}
          </span>

          <button
            type="button"
            onClick={() =>
              loadTournamentData(
                selectedTournamentId
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
            style={{
              borderColor:
                'var(--muted-slate)',
            }}
          >
            <RefreshCw
              size={15}
            />
            Refresh
          </button>
        </div>
      </div>
    </section>

    {message && (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
        {message}
      </section>
    )}

    {error && (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
        {error}
      </section>
    )}

    {/* =====================================================
        TOURNAMENTS
    ===================================================== */}

    <section className="grid gap-6 lg:grid-cols-2">
      <AdminCard
        icon={
          <Trophy
            size={20}
          />
        }
        title="Create Tournament"
        description="Create the competition that will contain your pools, teams and fixtures."
      >
        <div className="grid gap-4">
          <Field
            label="Tournament name"
          >
            <input
              value={
                tournamentName
              }
              onChange={(
                event
              ) =>
                setTournamentName(
                  event.target.value
                )
              }
              placeholder="St Stithians Water Polo Invitational"
              className="Input"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Competition">
              <select
                value={
                  tournamentCategory
                }
                onChange={(
                  event
                ) =>
                  setTournamentCategory(
                    event.target
                      .value as Category
                  )
                }
                className="Input"
              >
                <option value="GIRLS">
                  Girls
                </option>

                <option value="BOYS">
                  Boys
                </option>
              </select>
            </Field>

            <Field label="Location">
              <input
                value={
                  tournamentLocation
                }
                onChange={(
                  event
                ) =>
                  setTournamentLocation(
                    event.target.value
                  )
                }
                placeholder="Cape Town"
                className="Input"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <input
                type="date"
                value={
                  tournamentStartDate
                }
                onChange={(
                  event
                ) =>
                  setTournamentStartDate(
                    event.target.value
                  )
                }
                className="Input"
              />
            </Field>

            <Field label="End date">
              <input
                type="date"
                value={
                  tournamentEndDate
                }
                onChange={(
                  event
                ) =>
                  setTournamentEndDate(
                    event.target.value
                  )
                }
                className="Input"
              />
            </Field>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={
              createTournament
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background:
                'var(--veldt-green)',
            }}
          >
            <Plus
              size={17}
            />
            {loading
              ? 'Creating...'
              : 'Create Tournament'}
          </button>
        </div>
      </AdminCard>

      <AdminCard
        icon={
          <Calendar
            size={20}
          />
        }
        title="Current Tournament"
        description="Choose the tournament you are currently configuring."
      >
        <Field label="Tournament">
          <div className="relative">
            <select
              value={
                selectedTournamentId
              }
              onChange={(
                event
              ) =>
                setSelectedTournamentId(
                  event.target.value
                )
              }
              className="Input pr-10"
            >
              <option value="">
                Select tournament
              </option>

              {tournaments.map(
                (tournament) => (
                  <option
                    key={
                      tournament.id
                    }
                    value={
                      tournament.id
                    }
                  >
                    {
                      tournament.name
                    }
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </Field>

        {selectedTournament && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Selected competition
            </p>

            <h3
              className="mt-1 text-lg font-black"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              {
                selectedTournament.name
              }
            </h3>

            <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
              <div>
                <span className="font-black text-slate-700">
                  Category
                </span>

                <div>
                  {selectedTournament.competition_category ??
                    'Not set'}
                </div>
              </div>

              <div>
                <span className="font-black text-slate-700">
                  Teams
                </span>

                <div>
                  {teams.length}
                </div>
              </div>

              <div>
                <span className="font-black text-slate-700">
                  Matches
                </span>

                <div>
                  {matches.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminCard>
    </section>

    {selectedTournamentId && (
      <>
        {/* =====================================================
            POOLS
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">
          <AdminCard
            icon={
              <Layers
                size={20}
              />
            }
            title="Create Pool"
            description="Add Pool A, Pool B, Pool C, etc. for the selected tournament."
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <input
                value={
                  poolName
                }
                onChange={(
                  event
                ) =>
                  setPoolName(
                    event.target.value
                  )
                }
                placeholder="Pool A"
                className="Input flex-1"
              />

              <button
                type="button"
                disabled={loading}
                onClick={
                  createPool
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white"
                style={{
                  background:
                    'var(--veldt-green)',
                }}
              >
                <Plus
                  size={17}
                />
                Add Pool
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {pools.map(
                (pool) => (
                  <div
                    key={
                      pool.id
                    }
                    className="rounded-xl border bg-slate-50 px-4 py-3 text-sm font-black"
                    style={{
                      borderColor:
                        'var(--muted-slate)',
                    }}
                  >
                    {pool.name}
                  </div>
                )
              )}

              {!pools.length && (
                <p className="text-sm text-slate-400">
                  No pools created yet.
                </p>
              )}
            </div>
          </AdminCard>

          <AdminCard
            icon={
              <Users
                size={20}
              />
            }
            title="Tournament Structure"
            description="Teams can be standard, invitational or exhibition participants."
          >
            <div className="grid gap-3">
              <InfoBadge
                label="Standard"
                className={participationClasses(
                  'STANDARD'
                )}
                description="Counts toward official season rankings."
              />

              <InfoBadge
                label="Invitational"
                className={participationClasses(
                  'INVITATIONAL'
                )}
                description="Plays normally but does not count toward official season rankings."
              />

              <InfoBadge
                label="Exhibition"
                className={participationClasses(
                  'EXHIBITION'
                )}
                description="Recorded for the tournament but excluded from official rankings."
              />
            </div>
          </AdminCard>
        </section>

        {/* =====================================================
            TEAMS
        ===================================================== */}

        <AdminCard
          icon={
            <Users
              size={20}
            />
          }
          title="Add Tournament Team"
          description="Participation type applies to this team's participation in this tournament, not globally to the team."
        >
          <div className="grid gap-4 lg:grid-cols-5">
            <Field
              label="Team name"
            >
              <input
                value={
                  teamName
                }
                onChange={(
                  event
                ) =>
                  setTeamName(
                    event.target.value
                  )
                }
                placeholder="St Mary's School"
                className="Input"
              />
            </Field>

            <Field label="City">
              <input
                value={
                  teamCity
                }
                onChange={(
                  event
                ) =>
                  setTeamCity(
                    event.target.value
                  )
                }
                placeholder="Johannesburg"
                className="Input"
              />
            </Field>

            <Field label="Province">
              <input
                value={
                  teamProvince
                }
                onChange={(
                  event
                ) =>
                  setTeamProvince(
                    event.target.value
                  )
                }
                placeholder="Gauteng"
                className="Input"
              />
            </Field>

            <Field label="Pool">
              <select
                value={
                  selectedPoolId
                }
                onChange={(
                  event
                ) =>
                  setSelectedPoolId(
                    event.target.value
                  )
                }
                className="Input"
              >
                <option value="">
                  Unassigned
                </option>

                {pools.map(
                  (pool) => (
                    <option
                      key={
                        pool.id
                      }
                      value={
                        pool.id
                      }
                    >
                      {
                        pool.name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Participation">
              <select
                value={
                  participationType
                }
                onChange={(
                  event
                ) =>
                  setParticipationType(
                    normaliseParticipationType(
                      event.target
                        .value
                    )
                  )
                }
                className="Input"
              >
                <option value="STANDARD">
                  Standard
                </option>

                <option value="INVITATIONAL">
                  Invitational
                </option>

                <option value="EXHIBITION">
                  Exhibition
                </option>
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Invitational and exhibition teams remain
              available for fixtures, live scoring and
              match reports but are excluded from official
              season rankings.
            </p>

            <button
              type="button"
              disabled={
                loading
              }
              onClick={
                createTeam
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white"
              style={{
                background:
                  'var(--veldt-green)',
              }}
            >
              <Plus
                size={17}
              />
              Add Team
            </button>
          </div>
        </AdminCard>

        {/* =====================================================
            TEAM LIST
        ===================================================== */}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    'var(--veldt-ochre)',
                }}
              >
                Teams
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Tournament Teams
              </h2>
            </div>

            <p className="text-sm font-bold text-slate-400">
              {teams.length}{' '}
              teams
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map(
              (team) => (
                <div
                  key={
                    team.id
                  }
                  className="rounded-3xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className="truncate text-lg font-black"
                        style={{
                          color:
                            'var(--veldt-green)',
                        }}
                      >
                        {
                          team.name
                        }
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {[
                          team.city,
                          team.province,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ', '
                          ) ||
                          'Location not set'}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${participationClasses(
                        team.participation_type ??
                          'STANDARD'
                      )}`}
                    >
                      {formatParticipationType(
                        team.participation_type ??
                          'STANDARD'
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Pool
                      </p>

                      <select
                        value={
                          team.pool_group_id ??
                          ''
                        }
                        onChange={(
                          event
                        ) =>
                          updateTeamPool(
                            team.id,
                            event
                              .target
                              .value ||
                              null
                          )
                        }
                        className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-xs font-bold outline-none"
                        style={{
                          borderColor:
                            'var(--muted-slate)',
                        }}
                      >
                        <option value="">
                          Unassigned
                        </option>

                        {pools.map(
                          (
                            pool
                          ) => (
                            <option
                              key={
                                pool.id
                              }
                              value={
                                pool.id
                              }
                            >
                              {
                                pool.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Participation
                      </p>

                      <select
                        value={
                          team.participation_type ??
                          'STANDARD'
                        }
                        onChange={(
                          event
                        ) =>
                          updateParticipation(
                            team.id,
                            normaliseParticipationType(
                              event
                                .target
                                .value
                            )
                          )
                        }
                        className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-xs font-bold outline-none"
                        style={{
                          borderColor:
                            'var(--muted-slate)',
                        }}
                      >
                        <option value="STANDARD">
                          Standard
                        </option>

                        <option value="INVITATIONAL">
                          Invitational
                        </option>

                        <option value="EXHIBITION">
                          Exhibition
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* =====================================================
            FIXTURE CREATION
        ===================================================== */}

        <AdminCard
          icon={
            <Calendar
              size={20}
            />
          }
          title="Create Fixture"
          description="Create an individual scheduled match."
        >
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Match number">
              <input
                type="number"
                min="1"
                value={
                  fixtureMatchNumber
                }
                onChange={(
                  event
                ) =>
                  setFixtureMatchNumber(
                    event.target.value
                  )
                }
                placeholder="1"
                className="Input"
              />
            </Field>

            <Field label="Pool">
              <select
                value={
                  fixturePoolId
                }
                onChange={(
                  event
                ) =>
                  setFixturePoolId(
                    event.target.value
                  )
                }
                className="Input"
              >
                <option value="">
                  No pool
                </option>

                {pools.map(
                  (pool) => (
                    <option
                      key={
                        pool.id
                      }
                      value={
                        pool.id
                      }
                    >
                      {
                        pool.name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Home team">
              <select
                value={
                  homeTeamId
                }
                onChange={(
                  event
                ) =>
                  setHomeTeamId(
                    event.target.value
                  )
                }
                className="Input"
              >
                <option value="">
                  Select home team
                </option>

                {sortedTeams.map(
                  (team) => (
                    <option
                      key={
                        team.id
                      }
                      value={
                        team.id
                      }
                    >
                      {
                        team.name
                      }
                      {team.participation_type !==
                        'STANDARD'
                        ? ` — ${formatParticipationType(
                            team.participation_type ??
                              'STANDARD'
                          )}`
                        : ''}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Away team">
              <select
                value={
                  awayTeamId
                }
                onChange={(
                  event
                ) =>
                  setAwayTeamId(
                    event.target.value
                  )
                }
                className="Input"
              >
                <option value="">
                  Select away team
                </option>

                {sortedTeams.map(
                  (team) => (
                    <option
                      key={
                        team.id
                      }
                      value={
                        team.id
                      }
                    >
                      {
                        team.name
                      }
                      {team.participation_type !==
                        'STANDARD'
                        ? ` — ${formatParticipationType(
                            team.participation_type ??
                              'STANDARD'
                          )}`
                        : ''}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Field label="Date">
              <input
                type="date"
                value={
                  fixtureDate
                }
                onChange={(
                  event
                ) =>
                  setFixtureDate(
                    event.target.value
                  )
                }
                className="Input"
              />
            </Field>

            <Field label="Time">
              <input
                type="time"
                value={
                  fixtureTime
                }
                onChange={(
                  event
                ) =>
                  setFixtureTime(
                    event.target.value
                  )
                }
                className="Input"
              />
            </Field>

            <Field label="Pool location">
              <input
                value={
                  fixturePoolLocation
                }
                onChange={(
                  event
                ) =>
                  setFixturePoolLocation(
                    event.target.value
                  )
                }
                placeholder="Pool 1"
                className="Input"
              />
            </Field>

            <Field label="Round">
              <input
                value={
                  fixtureRoundType
                }
                onChange={(
                  event
                ) =>
                  setFixtureRoundType(
                    event.target.value
                  )
                }
                placeholder="Pool"
                className="Input"
              />
            </Field>

            <Field label="Stage">
              <select
                value={
                  fixtureStageType
                }
                onChange={(
                  event
                ) =>
                  setFixtureStageType(
                    event.target.value
                  )
                }
                className="Input"
              >
                <option value="POOL">
                  Pool
                </option>

                <option value="QUARTER_FINAL">
                  Quarter Final
                </option>

                <option value="SEMI_FINAL">
                  Semi Final
                </option>

                <option value="FINAL">
                  Final
                </option>

                <option value="THIRD_PLACE">
                  Third Place
                </option>
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="Stage name">
              <input
                value={
                  fixtureStageName
                }
                onChange={(
                  event
                ) =>
                  setFixtureStageName(
                    event.target.value
                  )
                }
                placeholder="Semi Final 1"
                className="Input"
              />
            </Field>

            <Field label="Stage order">
              <input
                type="number"
                value={
                  fixtureStageOrder
                }
                onChange={(
                  event
                ) =>
                  setFixtureStageOrder(
                    event.target.value
                  )
                }
                placeholder="1"
                className="Input"
              />
            </Field>

            <Field label="Home cap">
              <select
                value={
                  fixtureHomeCap
                }
                onChange={(
                  event
                ) =>
                  setFixtureHomeCap(
                    event.target
                      .value as
                      | 'white'
                      | 'blue'
                      | 'dark'
                  )
                }
                className="Input"
              >
                <option value="white">
                  White
                </option>

                <option value="blue">
                  Blue
                </option>

                <option value="dark">
                  Dark
                </option>
              </select>
            </Field>

            <Field label="Away cap">
              <select
                value={
                  fixtureAwayCap
                }
                onChange={(
                  event
                ) =>
                  setFixtureAwayCap(
                    event.target
                      .value as
                      | 'white'
                      | 'blue'
                      | 'dark'
                  )
                }
                className="Input"
              >
                <option value="blue">
                  Blue
                </option>

                <option value="white">
                  White
                </option>

                <option value="dark">
                  Dark
                </option>
              </select>
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={
                loading
              }
              onClick={
                createFixture
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white"
              style={{
                background:
                  'var(--veldt-green)',
              }}
            >
              <Plus
                size={17}
              />
              Create Fixture
            </button>
          </div>
        </AdminCard>

        {/* =====================================================
            SPREADSHEET IMPORT
        ===================================================== */}

        <AdminCard
          icon={
            <FileSpreadsheet
              size={20}
            />
          }
          title="Upload Fixtures"
          description="Import multiple fixtures from a CSV spreadsheet before the tournament."
        >
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <label className="flex cursor-pointer flex-col items-center justify-center text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background:
                    'var(--veldt-green)',
                }}
              >
                <Upload
                  size={24}
                  className="text-white"
                />
              </div>

              <h3 className="mt-4 text-lg font-black">
                Upload fixture CSV
              </h3>

              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Use the columns tournament_name,
                match_number, pool, scheduled_time,
                home_team and away_team. Additional
                tournament and stage fields are optional.
              </p>

              <span
                className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-black text-white"
                style={{
                  background:
                    'var(--veldt-ochre)',
                }}
              >
                Choose CSV file
              </span>

              <input
                type="file"
                accept=".csv,text/csv"
                onChange={
                  handleFixtureFile
                }
                className="hidden"
              />
            </label>
          </div>

          {fixtureFileName && (
            <div className="mt-4 rounded-xl border bg-white px-4 py-3 text-sm">
              <span className="font-black">
                File:
              </span>{' '}
              {
                fixtureFileName
              }
            </div>
          )}

          {fixtureImportErrors.length >
            0 && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-black text-red-700">
                Spreadsheet validation errors
              </h4>

              <div className="mt-2 max-h-52 space-y-1 overflow-auto text-xs text-red-600">
                {fixtureImportErrors.map(
                  (
                    fixtureError,
                    index
                  ) => (
                    <p
                      key={
                        `${fixtureError}-${index}`
                      }
                    >
                      {fixtureError}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {fixturePreview.length >
            0 && (
            <div className="mt-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Preview
                  </p>

                  <h3 className="text-lg font-black">
                    {
                      fixturePreview.length
                    }{' '}
                    fixture
                    {fixturePreview.length ===
                    1
                      ? ''
                      : 's'}
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={
                    importingFixtures ||
                    fixtureImportErrors.length >
                      0
                  }
                  onClick={
                    importFixtures
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background:
                      'var(--veldt-green)',
                  }}
                >
                  <Upload
                    size={16}
                  />

                  {importingFixtures
                    ? 'Importing...'
                    : 'Import Fixtures'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 font-black">
                        #
                      </th>

                      <th className="px-3 py-3 font-black">
                        Pool
                      </th>

                      <th className="px-3 py-3 font-black">
                        Date / Time
                      </th>

                      <th className="px-3 py-3 font-black">
                        Home
                      </th>

                      <th className="px-3 py-3 font-black">
                        Away
                      </th>

                      <th className="px-3 py-3 font-black">
                        Location
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {fixturePreview
                      .slice(
                        0,
                        25
                      )
                      .map(
                        (
                          fixture,
                          index
                        ) => (
                          <tr
                            key={`${fixture.match_number}-${index}`}
                            className="border-t"
                          >
                            <td className="px-3 py-3 font-black">
                              {
                                fixture.match_number
                              }
                            </td>

                            <td className="px-3 py-3">
                              {
                                fixture.pool ||
                                '—'
                              }
                            </td>

                            <td className="whitespace-nowrap px-3 py-3">
                              {
                                fixture.scheduled_time
                              }
                            </td>

                            <td className="px-3 py-3">
                              {
                                fixture.home_team
                              }
                            </td>

                            <td className="px-3 py-3">
                              {
                                fixture.away_team
                              }
                            </td>

                            <td className="px-3 py-3">
                              {
                                fixture.pool_location ||
                                '—'
                              }
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>

              {fixturePreview.length >
                25 && (
                <p className="mt-2 text-xs text-slate-400">
                  Showing the first 25
                  fixtures in the preview.
                </p>
              )}
            </div>
          )}
        </AdminCard>

        {/* =====================================================
            FIXTURE LIST
        ===================================================== */}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    'var(--veldt-ochre)',
                }}
              >
                Schedule
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Fixtures
              </h2>
            </div>

            <p className="text-sm font-bold text-slate-400">
              {matches.length}{' '}
              matches
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            {!matches.length ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No fixtures have been created yet.
              </div>
            ) : (
              <div className="divide-y">
                {matches.map(
                  (
                    match
                  ) => (
                    <div
                      key={
                        match.id
                      }
                      className="grid gap-4 px-5 py-5 md:grid-cols-[70px_1fr_140px_120px]"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Match
                        </p>

                        <p
                          className="mt-1 text-lg font-black"
                          style={{
                            color:
                              'var(--veldt-green)',
                          }}
                        >
                          {match.match_number ??
                            '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                          {match.pool_group?.name ??
                            'No Pool'}
                        </p>

                        <div className="mt-1 flex flex-col gap-1 text-sm font-black">
                          <span>
                            {match.home_team?.name ??
                              'TBD'}
                          </span>

                          <span className="text-slate-400">
                            vs
                          </span>

                          <span>
                            {match.away_team?.name ??
                              'TBD'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Scheduled
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {match.scheduled_time
                            ? new Date(
                                match.scheduled_time
                              ).toLocaleString(
                                'en-ZA',
                                {
                                  day: '2-digit',
                                  month:
                                    'short',
                                  hour: '2-digit',
                                  minute:
                                    '2-digit',
                                }
                              )
                            : 'Not scheduled'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {match.pool_location ??
                            'Location not set'}
                        </p>
                      </div>

                      <div className="flex items-start md:justify-end">
                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                            String(
                              match.status ??
                                'SCHEDULED'
                            ).toUpperCase() ===
                            'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {match.status ??
                            'SCHEDULED'}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </>
    )}
  </main>

  <style jsx global>{`
    .Input {
      width: 100%;
      border-radius: 0.75rem;
      border: 1px solid var(--muted-slate);
      background: #ffffff;
      padding: 0.75rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 700;
      outline: none;
      transition:
        border-color 120ms ease,
        box-shadow 120ms ease;
    }

    .Input:focus {
      border-color: var(--veldt-ochre);
      box-shadow:
        0 0 0 3px rgba(216, 145, 59, 0.12);
    }

    .Input::placeholder {
      color: #94a3b8;
      font-weight: 600;
    }
  `}</style>
</div>
);
}
function AdminCard({
icon,
title,
description,
children,
}: {
icon: React.ReactNode;
title: string;
description: string;
children: React.ReactNode;
}) {
return (
<section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
<div className="flex items-start gap-3">
<div
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
style={{
background:
'var(--veldt-green)',
}}
>
{icon}
</div>
    <div>
      <h2 className="text-lg font-black text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </div>
  </div>

  <div className="mt-5">
    {children}
  </div>
</section>
);
}
function Field({
label,
children,
}: {
label: string;
children: React.ReactNode;
}) {
return (
<label className="block">
<span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
{label}
</span>
  {children}
</label>
);
}
function InfoBadge({
label,
description,
className,
}: {
label: string;
description: string;
className: string;
}) {
return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-3">
      <span
        className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${className}`}
      >
        {label}
      </span>
      <p className="text-right text-xs text-slate-500">{description}</p>
    </div>
);
}