export type StageType =
  | 'POOL'
  | 'CROSSOVER'
  | 'PLACEMENT'
  | 'QUARTER-FINAL'
  | 'SEMI-FINAL'
  | 'FINAL';

export type CapColor =
  | 'white'
  | 'blue'
  | 'dark';

export type MatchSlot =
  | {
      type: 'TEAM';
      teamId: string;
      label?: string;
    }
  | {
      type: 'POOL_POSITION';
      poolId: string;
      position: number;
      label?: string;
    }
  | {
      type: 'MATCH_WINNER';
      matchId: string;
      label?: string;
    }
  | {
      type: 'MATCH_LOSER';
      matchId: string;
      label?: string;
    };

export type DraftFixture = {
  id: string;

  stageType: StageType;

  stageName: string;

  stageOrder: number;

  matchNumber: number;

  homeSlot: MatchSlot;

  awaySlot: MatchSlot;

  poolId: string | null;

  scheduledTime: string;

  homeCapColor: CapColor;

  awayCapColor: CapColor;
};

export type DraftPool = {
  id: string;
  name: string;
};

export type DraftTeam = {
  id: string;
  name: string;
  poolId: string | null;
};

export type FixtureImportRow = {
  stageType?: string;
  stageName?: string;
  matchNumber?: string | number;
  home?: string;
  away?: string;
  pool?: string;
  scheduledTime?: string;
  homeCap?: string;
  awayCap?: string;
};

export function isStageType(
  value: string
): value is StageType {
  return (
    value === 'POOL' ||
    value === 'CROSSOVER' ||
    value === 'PLACEMENT' ||
    value === 'QUARTER-FINAL' ||
    value === 'SEMI-FINAL' ||
    value === 'FINAL'
  );
}

export function isCapColor(
  value: string
): value is CapColor {
  return (
    value === 'white' ||
    value === 'blue' ||
    value === 'dark'
  );
}

export function formatStageType(
  stageType: StageType
) {
  switch (stageType) {
    case 'POOL':
      return 'Pool';

    case 'CROSSOVER':
      return 'Crossover';

    case 'PLACEMENT':
      return 'Placement';

    case 'QUARTER-FINAL':
      return 'Quarter-Final';
    
    case 'SEMI-FINAL':
      return 'Semi-Final';

    case 'FINAL':
      return 'Final';

    default:
      return stageType;
  }
}

export function formatSlotLabel(
  slot: MatchSlot
) {
  if (slot.label) {
    return slot.label;
  }

  switch (slot.type) {
    case 'TEAM':
      return slot.teamId;

    case 'POOL_POSITION':
      return `${slot.position} in pool ${slot.poolId}`;

    case 'MATCH_WINNER':
      return `Winner of ${slot.matchId}`;

    case 'MATCH_LOSER':
      return `Loser of ${slot.matchId}`;

    default:
      return 'Unknown';
  }
}