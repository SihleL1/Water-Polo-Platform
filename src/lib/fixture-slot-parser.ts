import type {DraftFixture, DraftPool, DraftTeam, MatchSlot} from '@/lib/tournament-fixtures';

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function ordinal(
  position: number
) {
  if (position === 1) return '1st';
  if (position === 2) return '2nd';
  if (position === 3) return '3rd';
  return `${position}th`;
}

function findFixtureReference(
  value: string,
  fixtures: DraftFixture[]
) {
  const normalizedValue =
    normalize(value);

  return fixtures.find((fixture) => {
    const fullLabel = normalize(
      `${fixture.stageName} ${fixture.matchNumber}`
    );

    const stageOnly = normalize(
      fixture.stageName
    );

    const matchNumberOnly =
      String(fixture.matchNumber);

    return (
      normalizedValue === fullLabel ||
      normalizedValue === stageOnly ||
      normalizedValue === matchNumberOnly
    );
  });
}

export function parseFixtureSlot(
  rawValue: unknown,
  teams: DraftTeam[],
  pools: DraftPool[],
  fixtures: DraftFixture[]
): MatchSlot {
  const value = String(
    rawValue ?? ''
  ).trim();

  if (!value) {
    throw new Error(
      'Fixture participant cannot be empty.'
    );
  }

  const normalizedValue =
    normalize(value);

  /*
   * ---------------------------------------------------------
   * EXISTING TEAM
   * ---------------------------------------------------------
   */

  const team = teams.find(
    (candidate) =>
      normalize(candidate.name) ===
      normalizedValue
  );

  if (team) {
    return {
      type: 'TEAM',
      teamId: team.id,
      label: team.name,
    };
  }

  /*
   * ---------------------------------------------------------
   * EXPLICIT TEAM ID
   *
   * TEAM:<uuid>
   * ---------------------------------------------------------
   */

  if (value.startsWith('TEAM:')) {
    const teamId =
      value.substring('TEAM:'.length).trim();

    if (!teamId) {
      throw new Error(
        'TEAM slot is missing the team ID.'
      );
    }

    const existingTeam = teams.find(
      (candidate) =>
        candidate.id === teamId
    );

    if (!existingTeam) {
      throw new Error(
        `Team "${teamId}" was not found.`
      );
    }

    return {
      type: 'TEAM',
      teamId,
      label: existingTeam.name,
    };
  }

  /*
   * ---------------------------------------------------------
   * EXPLICIT POOL POSITION
   *
   * POOL_POSITION:<poolId>:<position>
   * ---------------------------------------------------------
   */

  if (
    value.startsWith(
      'POOL_POSITION:'
    )
  ) {
    const parts =
      value.split(':');

    if (parts.length !== 3) {
      throw new Error(
        `Invalid pool position "${value}".`
      );
    }

    const poolId = parts[1];

    const position =
      Number(parts[2]);

    if (!Number.isInteger(position) || position < 1) {
      throw new Error(
        `Invalid pool position "${value}".`
      );
    }

    const pool = pools.find(
      (candidate) =>
        candidate.id === poolId
    );

    if (!pool) {
      throw new Error(
        `Pool "${poolId}" was not found.`
      );
    }

    return {
      type: 'POOL_POSITION',
      poolId,
      position,
      label: `${ordinal(position)} ${pool.name}`,
    };
  }

  /*
   * ---------------------------------------------------------
   * EXPLICIT MATCH WINNER
   *
   * MATCH_WINNER:<matchId>
   * ---------------------------------------------------------
   */

  if (
    value.startsWith(
      'MATCH_WINNER:'
    )
  ) {
    const matchId =
      value.substring(
        'MATCH_WINNER:'.length
      ).trim();

    const fixture =
      fixtures.find(
        (candidate) =>
          candidate.id === matchId
      );

    if (!fixture) {
      throw new Error(
        `Fixture "${matchId}" was not found.`
      );
    }

    return {
      type: 'MATCH_WINNER',
      matchId,
      label: `Winner ${fixture.stageName} ${fixture.matchNumber}`,
    };
  }

  /*
   * ---------------------------------------------------------
   * EXPLICIT MATCH LOSER
   *
   * MATCH_LOSER:<matchId>
   * ---------------------------------------------------------
   */

  if (
    value.startsWith(
      'MATCH_LOSER:'
    )
  ) {
    const matchId =
      value.substring(
        'MATCH_LOSER:'.length
      ).trim();

    const fixture =
      fixtures.find(
        (candidate) =>
          candidate.id === matchId
      );

    if (!fixture) {
      throw new Error(
        `Fixture "${matchId}" was not found.`
      );
    }

    return {
      type: 'MATCH_LOSER',
      matchId,
      label: `Loser ${fixture.stageName} ${fixture.matchNumber}`,
    };
  }

  /*
   * ---------------------------------------------------------
   * "1st Pool A"
   * "2nd Pool B"
   * "4th Pool C"
   * ---------------------------------------------------------
   */

  const poolPositionMatch =
    value.match(
      /^(\d+)(?:st|nd|rd|th)\s+(.+)$/i
    );

  if (poolPositionMatch) {
    const position =
      Number(
        poolPositionMatch[1]
      );

    const poolName =
      poolPositionMatch[2].trim();

    if (
      !Number.isInteger(position) ||
      position < 1
    ) {
      throw new Error(
        `Invalid position "${position}".`
      );
    }

    const pool =
      pools.find(
        (candidate) =>
          normalize(candidate.name) ===
          normalize(poolName)
      );

    if (!pool) {
      throw new Error(
        `Pool "${poolName}" was not found.`
      );
    }

    return {
      type: 'POOL_POSITION',
      poolId: pool.id,
      position,
      label: `${ordinal(position)} ${pool.name}`,
    };
  }

  /*
   * ---------------------------------------------------------
   * WINNER / LOSER REFERENCES
   *
   * Winner Crossover 1
   * Loser Semi Final 2
   * Winner Quarter Final 1
   * ---------------------------------------------------------
   */

  const resultMatch =
    value.match(
      /^(winner|loser)\s+(.+)$/i
    );

  if (resultMatch) {
    const resultType =
      resultMatch[1].toLowerCase();

    const reference =
      resultMatch[2].trim();

    const fixture =
      findFixtureReference(
        reference,
        fixtures
      );

    if (!fixture) {
      throw new Error(
        `Fixture "${reference}" was not found.`
      );
    }

    return {
      type:
        resultType === 'winner'
          ? 'MATCH_WINNER'
          : 'MATCH_LOSER',

      matchId: fixture.id,

      label: `${
        resultType === 'winner'
          ? 'Winner'
          : 'Loser'
      } ${fixture.stageName} ${fixture.matchNumber}`,
    };
  }

  throw new Error(
    `"${value}" could not be matched to an existing school, pool position, previous match winner, or previous match loser.`
  );
}

export function decodeFixtureSlot(
  value: string,
  teams: DraftTeam[],
  pools: DraftPool[],
  fixtures: DraftFixture[]
) {
  return parseFixtureSlot(
    value,
    teams,
    pools,
    fixtures
  );
}