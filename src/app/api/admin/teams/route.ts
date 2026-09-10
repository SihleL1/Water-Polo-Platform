import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabaseServer';

const VALID_PARTICIPATION_TYPES = [
'STANDARD',
'INVITATIONAL',
'EXHIBITION',
] as const;

type ParticipationType =
(typeof VALID_PARTICIPATION_TYPES)[number];

export async function POST(
request: Request
) {
try {

const supabase =
  createServerSupabase();
  
const body = await request.json();

const name =
  typeof body?.name === 'string'
    ? body.name.trim()
    : '';

const tournamentId =
  typeof body?.tournamentId === 'string'
    ? body.tournamentId
    : '';

const poolGroupId =
  typeof body?.poolGroupId === 'string' &&
  body.poolGroupId.trim()
    ? body.poolGroupId
    : null;

const city =
  typeof body?.city === 'string' &&
  body.city.trim()
    ? body.city.trim()
    : null;

const province =
  typeof body?.province === 'string' &&
  body.province.trim()
    ? body.province.trim()
    : null;

const participationType: ParticipationType =
  VALID_PARTICIPATION_TYPES.includes(
    body?.participationType
  )
    ? body.participationType
    : 'STANDARD';

if (!name) {
  return NextResponse.json(
    {
      error: 'Team name is required.',
    },
    {
      status: 400,
    }
  );
}

if (!tournamentId) {
  return NextResponse.json(
    {
      error:
        'Tournament ID is required.',
    },
    {
      status: 400,
    }
  );
}

/*
 * Check whether the team already exists.
 */
const {
  data: existingTeam,
  error: existingTeamError,
} = await supabase
  .from('teams')
  .select('id,name')
  .ilike('name', name)
  .maybeSingle();

if (existingTeamError) {
  console.error(
    'Existing team lookup failed:',
    existingTeamError
  );

  return NextResponse.json(
    {
      error:
        'Unable to check whether the team already exists.',
    },
    {
      status: 500,
    }
  );
}

let teamId: string;

if (existingTeam) {
  teamId = existingTeam.id;

  /*
   * Keep the team's general location information
   * up to date when supplied.
   */
  const {
    error: teamUpdateError,
  } = await supabase
    .from('teams')
    .update({
      city,
      province,
    })
    .eq(
      'id',
      teamId
    );

  if (teamUpdateError) {
    console.error(
      'Team update failed:',
      teamUpdateError
    );
  }
} else {
  /*
   * Create a brand-new team.
   *
   * The team itself does NOT get a participation type.
   * Participation belongs to tournament_teams.
   */
  const {
    data: newTeam,
    error: createTeamError,
  } = await supabase
    .from('teams')
    .insert({
      name,
      city,
      province,
    })
    .select(
      'id,name,city,province'
    )
    .single();

  if (createTeamError) {
    console.error(
      'Create team failed:',
      createTeamError
    );

    return NextResponse.json(
      {
        error:
          createTeamError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!newTeam) {
    return NextResponse.json(
      {
        error:
          'Team could not be created.',
      },
      {
        status: 500,
      }
    );
  }

  teamId = newTeam.id;
}

/*
 * Check tournament participation.
 */
const {
  data: existingTournamentTeam,
  error: participationLookupError,
} = await supabase
  .from('tournament_teams')
  .select(
    'id,tournament_id,team_id,pool_group_id,participation_type'
  )
  .eq(
    'tournament_id',
    tournamentId
  )
  .eq(
    'team_id',
    teamId
  )
  .maybeSingle();

if (participationLookupError) {
  console.error(
    'Tournament-team lookup failed:',
    participationLookupError
  );

  return NextResponse.json(
    {
      error:
        'Unable to check tournament participation.',
    },
    {
      status: 500,
    }
  );
}

if (existingTournamentTeam) {
  const {
    data: updatedParticipation,
    error: participationUpdateError,
  } = await supabase
    .from('tournament_teams')
    .update({
      pool_group_id:
        poolGroupId,
      participation_type:
        participationType,
    })
    .eq(
      'id',
      existingTournamentTeam.id
    )
    .select()
    .single();

  if (
    participationUpdateError
  ) {
    console.error(
      'Tournament-team update failed:',
      participationUpdateError
    );

    return NextResponse.json(
      {
        error:
          participationUpdateError.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    team: existingTeam ?? null,
    tournamentTeam:
      updatedParticipation,
  });
}

const {
  data: tournamentTeam,
  error: participationInsertError,
} = await supabase
  .from('tournament_teams')
  .insert({
    tournament_id:
      tournamentId,
    team_id:
      teamId,
    pool_group_id:
      poolGroupId,
    participation_type:
      participationType,
  })
  .select()
  .single();

if (participationInsertError) {
  console.error(
    'Tournament-team insert failed:',
    participationInsertError
  );

  return NextResponse.json(
    {
      error:
        participationInsertError.message,
    },
    {
      status: 500,
    }
  );
}

return NextResponse.json({
  success: true,
  team: existingTeam,
  tournamentTeam,
});

} catch (error) {
console.error(
'POST /api/admin/teams failed:',
error
);

return NextResponse.json(
  {
    error:
      error instanceof Error
        ? error.message
        : 'Failed to create tournament team.',
  },
  {
    status: 500,
  }
);

}
}
