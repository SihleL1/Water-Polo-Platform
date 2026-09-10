import { createServerSupabase } from '@/lib/supabaseClient';

type MatchRecord = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
};

type EventRecord = {
  id: string;
  team_id: string | null;
  event_type: string;
};

export async function validateMatchStatistics(
  supabase: ReturnType<
    typeof createServerSupabase
  >,
  match: MatchRecord
) {
  const warnings: string[] = [];

  if (
    !match.home_team_id ||
    !match.away_team_id
  ) {
    warnings.push(
      'Both teams must be assigned.'
    );
  }

  if (
    match.home_score === null ||
    match.away_score === null
  ) {
    warnings.push(
      'Final score is missing.'
    );
  }

  const {
    data: events,
    error,
  } = await supabase
    .from('match_events')
    .select(
      'id,team_id,event_type'
    )
    .eq(
      'match_id',
      match.id
    );

  if (error) {
    warnings.push(
      `Could not load match events: ${error.message}`
    );

    return {
      valid: false,
      warnings,
    };
  }

  const eventRows =
    (events ??
      []) as EventRecord[];

  /*
   * Remove duplicate event IDs.
   */
  const seen = new Set<string>();

  const uniqueEvents =
    eventRows.filter((event) => {
      if (seen.has(event.id)) {
        return false;
      }

      seen.add(event.id);
      return true;
    });

  const homeEvents =
    uniqueEvents.filter(
      (event) =>
        event.team_id ===
        match.home_team_id
    );

  const awayEvents =
    uniqueEvents.filter(
      (event) =>
        event.team_id ===
        match.away_team_id
    );

  /*
   * Goals are authoritative from matches.
   *
   * We intentionally do NOT require the event
   * goal count to equal the official score because
   * corrections can happen and penalty scoring may
   * be represented separately.
   */

  const countEvent = (
    rows: EventRecord[],
    type: string
  ) =>
    rows.filter(
      (event) =>
        String(
          event.event_type
        ).toUpperCase() ===
        type
    ).length;

  const homeShots =
    countEvent(
      homeEvents,
      'SHOT_ON_TARGET'
    ) +
    countEvent(
      homeEvents,
      'SHOT_OFF_TARGET'
    );

  const awayShots =
    countEvent(
      awayEvents,
      'SHOT_ON_TARGET'
    ) +
    countEvent(
      awayEvents,
      'SHOT_OFF_TARGET'
    );

  /*
   * A team with goals but zero recorded shots
   * probably has incomplete event data.
   */
  if (
    Number(match.home_score ?? 0) >
      0 &&
    homeShots === 0
  ) {
    warnings.push(
      'Home team has goals but no recorded shots.'
    );
  }

  if (
    Number(match.away_score ?? 0) >
      0 &&
    awayShots === 0
  ) {
    warnings.push(
      'Away team has goals but no recorded shots.'
    );
  }

  /*
   * 5M consistency.
   */
  const homePenalties =
    countEvent(
      homeEvents,
      'PENALTY_TAKEN'
    );

  const homePenaltyResults =
    countEvent(
      homeEvents,
      'PENALTY_SCORED'
    ) +
    countEvent(
      homeEvents,
      'PENALTY_MISSED'
    );

  if (
    homePenaltyResults >
    homePenalties
  ) {
    warnings.push(
      'Home team has more recorded 5M results than 5M penalties taken.'
    );
  }

  const awayPenalties =
    countEvent(
      awayEvents,
      'PENALTY_TAKEN'
    );

  const awayPenaltyResults =
    countEvent(
      awayEvents,
      'PENALTY_SCORED'
    ) +
    countEvent(
      awayEvents,
      'PENALTY_MISSED'
    );

  if (
    awayPenaltyResults >
    awayPenalties
  ) {
    warnings.push(
      'Away team has more recorded 5M results than 5M penalties taken.'
    );
  }

  /*
   * Possession validation.
   */
  const homePossessions =
    countEvent(
      homeEvents,
      'POSSESSION_START'
    );

  const awayPossessions =
    countEvent(
      awayEvents,
      'POSSESSION_START'
    );

  if (
    homePossessions === 0 &&
    awayPossessions === 0
  ) {
    warnings.push(
      'No possession events recorded.'
    );
  }

  return {
    valid:
      warnings.length === 0,
    warnings,

    summary: {
      homeShots,
      awayShots,
      homePenalties,
      awayPenalties,
      homePossessions,
      awayPossessions,
    },
  };
}
