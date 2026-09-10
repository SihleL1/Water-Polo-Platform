export type WaterPoloEventCategory =
| 'SCORING'
| 'GAME CONTROL'
| 'SHOOTING'
| 'FOULS & EXCLUSIONS'
| 'POSSESSION & DEFENCE'
| 'ATTACK & TRANSITION';

export type WaterPoloEvent = {
id: string;
label: string;
category: WaterPoloEventCategory;
description?: string;
};

export const WATER_POLO_CATEGORY_STYLES: Record<
WaterPoloEventCategory,
{
accent: string;
glow: string;
text: string;
}

> = {
'SCORING': {
accent: '#E3A355',
glow: 'rgba(227,163,85,0.28)',
text: 'Scoring event',
 },

'SHOOTING': {
accent: '#60A5FA',
glow: 'rgba(96,165,250,0.25)',
text: 'Shooting event',
},

'FOULS & EXCLUSIONS': {
accent: '#F87171',
glow: 'rgba(248,113,113,0.25)',
text: 'Foul or exclusion',
},

'POSSESSION & DEFENCE': {
accent: '#34D399',
glow: 'rgba(52,211,153,0.25)',
text: 'Possession or defensive event',
},

'GAME CONTROL': {
accent: '#A78BFA',
glow: 'rgba(167,139,250,0.25)',
text: 'Match control event',
},

'ATTACK & TRANSITION': {
accent: '#FBBF24',
glow: 'rgba(251,191,36,0.25)',
text: 'Attack, transition or possession event',
},
};

export const WATER_POLO_EVENT_GROUPS: {
category: WaterPoloEventCategory;
title: string;
events: WaterPoloEvent[];
}[] = [
{
category: 'SCORING',
title: 'Scoring',
events: [
{
id: 'GOAL',
label: 'Goal',
category: 'SCORING',
description: 'Goal scored by the selected player',
},
{
id: 'PENALTY_GOAL',
label: 'Penalty Goal',
category: 'SCORING',
description: 'Penalty converted into a goal',
},
],
},

{
category: 'GAME CONTROL',
title: 'Game Control',
events: [
{
id: 'TIMEOUT',
label: 'Team Timeout',
category: 'GAME CONTROL',
},
{
id: 'PERIOD_START',
label: 'Period Start',
category: 'GAME CONTROL',
},
{
id: 'PERIOD_END',
label: 'Period End',
category: 'GAME CONTROL',
},
],
},

{
category: 'SHOOTING',
title: 'Shooting',
events: [
{
id: 'SHOT',
label: 'Shot',
category: 'SHOOTING',
description: 'Shot attempt',
},
{
id: 'SHOT_ON_TARGET',
label: 'Shot on Target',
category: 'SHOOTING',
description: 'Shot directed on target but not scored',
},
{
id: 'MISSED_SHOT',
label: 'Missed Shot',
category: 'SHOOTING',
description: 'Shot misses the target',
},
{
id: 'BLOCK',
label: 'Blocked Shot',
category: 'SHOOTING',
description: 'Shot blocked by a defender',
},
{
id: 'GOALKEEPER_SAVE',
label: 'GK Save',
category: 'SHOOTING',
description: 'Goalkeeper save',
},
],
},

{
category: 'FOULS & EXCLUSIONS',
title: 'Fouls & Exclusions',
events: [
{
id: 'ORDINARY_FOUL',
label: 'Ordinary Foul',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'EXCLUSION_COMMITTED',
label: '20s Exclusion',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'EXCLUSION_EARNED',
label: 'Exclusion Earned',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'PENALTY',
label: 'Penalty',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'PENALTY_MISSED',
label: 'Penalty Missed',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'YELLOW_CARD',
label: 'Yellow Card',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'RED_CARD',
label: 'Red Card',
category: 'FOULS & EXCLUSIONS',
},
{
id: 'ROLLING_EXCLUSION',
label: 'Rolling Exclusion',
category: 'FOULS & EXCLUSIONS',
},
],
},

{
category: 'POSSESSION & DEFENCE',
title: 'Possession & Defence',
events: [
{
id: 'STEAL',
label: 'Steal',
category: 'POSSESSION & DEFENCE',
},
{
id: 'INTERCEPTION',
label: 'Interception',
category: 'POSSESSION & DEFENCE',
},
{
id: 'TURNOVER',
label: 'Turnover',
category: 'POSSESSION & DEFENCE',
},
{
id: 'BLOCK',
label: 'Block',
category: 'POSSESSION & DEFENCE',
},
{
id: 'POSSESSION_START',
label: 'Possession Start',
category: 'POSSESSION & DEFENCE',
},
{
id: 'POSSESSION_END',
label: 'Possession End',
category: 'POSSESSION & DEFENCE',
},
{
id: 'CORNER_THROW_20',
label: '2m Corner Throw',
category: 'POSSESSION & DEFENCE',
},
],
},

{
category: 'ATTACK & TRANSITION',
title: 'Attack & Transition',
events: [
{
id: 'ASSIST',
label: 'Assist',
category: 'ATTACK & TRANSITION',
},
{
id: 'SPRINT_WON',
label: 'Sprint Won',
category: 'ATTACK & TRANSITION',
},
{
id: 'SPRINT_LOST',
label: 'Sprint Lost',
category: 'ATTACK & TRANSITION',
},
{
id: 'REBOUND',
label: 'Rebound',
category: 'ATTACK & TRANSITION',
},
{
id: 'OFFENSIVE_REBOUND',
label: 'Offensive Rebound',
category: 'ATTACK & TRANSITION',
},
{
id: 'DEFENSIVE_REBOUND',
label: 'Defensive Rebound',
category: 'ATTACK & TRANSITION',
},
],
},
];

