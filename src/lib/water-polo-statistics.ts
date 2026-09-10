export function calculateWaterPoloAdvancedStats({
  goalsFor,
  goalsAgainst,
  possessions,
  opponentPossessions,
  turnovers,
}: {
  goalsFor: number;
  goalsAgainst: number;
  possessions: number;
  opponentPossessions: number;
  turnovers: number;
}) {
  const offensiveEfficiency =
    possessions > 0
      ? (goalsFor / possessions) *
        100
      : null;

  const defensiveEfficiency =
    opponentPossessions > 0
      ? (goalsAgainst /
          opponentPossessions) *
        100
      : null;

  const netEfficiency =
    offensiveEfficiency !== null &&
    defensiveEfficiency !== null
      ? offensiveEfficiency -
        defensiveEfficiency
      : null;

  const turnoverRate =
    possessions > 0
      ? (turnovers / possessions) *
        100
      : null;

  return {
    offensiveEfficiency,
    defensiveEfficiency,
    netEfficiency,
    turnoverRate,
  };
}

export function calculateGoalPercentage({
  goals,
  shots,
}: {
  goals: number;
  shots: number;
}) {
  if (!shots) {
    return null;
  }

  return (
    (goals / shots) *
    100
  );
}

export function calculateSprintWinPercentage({
  wins,
  attempts,
}: {
  wins: number;
  attempts: number;
}) {
  if (!attempts) {
    return null;
  }

  return (
    (wins / attempts) *
    100
  );
}