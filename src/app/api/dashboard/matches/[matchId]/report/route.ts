import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

import { createServerSupabase } from '../../../../../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const COLORS = {
green: rgb(35 / 255, 71 / 255, 35 / 255),
ochre: rgb(216 / 255, 145 / 255, 59 / 255),
dark: rgb(15 / 255, 23 / 255, 16 / 255),
sage: rgb(102 / 255, 127 / 255, 102 / 255),
slate: rgb(100 / 255, 116 / 255, 139 / 255),
light: rgb(248 / 255, 249 / 255, 250 / 255),
border: rgb(226 / 255, 232 / 255, 240 / 255),
white: rgb(1, 1, 1),
red: rgb(185 / 255, 28 / 255, 28 / 255),
successBackground: rgb(
240 / 255,
253 / 255,
244 / 255
),
successBorder: rgb(
187 / 255,
247 / 255,
208 / 255
),
warningBackground: rgb(
254 / 255,
242 / 255,
242 / 255
),
warningBorder: rgb(
254 / 255,
202 / 255,
202 / 255
),
};

type MatchRow = {
id: string;
tournament_id: string | null;
pool_group_id: string | null;
home_team_id: string | null;
away_team_id: string | null;
home_score: number | null;
away_score: number | null;
period: number | null;
status: string | null;
scheduled_time: string | null;
pool_location: string | null;
round_type: string | null;
match_number: number | null;
completed_at: string | null;
};

type TeamRow = {
id: string;
name: string;
province: string | null;
city: string | null;
};

type TournamentRow = {
id: string;
name: string;
competition_category: string | null;
start_date: string | null;
end_date: string | null;
location: string | null;
};

type PoolRow = {
id: string;
name: string;
};

type EventRow = {
id: string;
period: number | null;
game_clock: number | null;
team_id: string | null;
event_category: string | null;
created_at: string | null;
};

type TeamStats = {
goals: number;
totalShots: number;
shotsOnTarget: number;
shotsOffTarget: number;
saves: number;
steals: number;
turnovers: number;
blocks: number;
exclusionsDrawn: number;
exclusionsCommitted: number;
penaltiesTaken: number;
penaltiesScored: number;
penaltiesMissed: number;
};

function safeNumber(value: unknown): number {
return typeof value === 'number' && Number.isFinite(value)
? value
: 0;
}

function upper(value: unknown): string {
return String(value ?? '')
.trim()
.toUpperCase();
}

function isCompleted(status: string | null): boolean {
return [
'COMPLETED',
'FINAL',
'FINISHED',
].includes(upper(status));
}

function formatDate(value: string | null): string {
if (!value) {
return 'Not recorded';
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Not recorded';
}

return new Intl.DateTimeFormat('en-ZA', {
day: '2-digit',
month: 'short',
year: 'numeric',
}).format(date);
}

function formatDateTime(value: string | null): string {
if (!value) {
return 'Not recorded';
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Not recorded';
}

return new Intl.DateTimeFormat('en-ZA', {
day: '2-digit',
month: 'short',
year: 'numeric',
hour: '2-digit',
minute: '2-digit',
}).format(date);
}

function formatClock(seconds: number | null): string {
const total = Math.max(
0,
Math.floor(safeNumber(seconds))
);

const minutes = Math.floor(total / 60);
const remaining = total % 60;

return `${String(minutes).padStart(2, '0')}:${String(
    remaining
  ).padStart(2, '0')}`;
}

function cleanFileName(value: string): string {
return (
value
.replace(/[^a-z0-9]+/gi, '-')
.replace(/^-+|-+$/g, '')
.toLowerCase()
.slice(0, 60) || 'team'
);
}

function countCategory(
events: EventRow[],
teamId: string,
categories: string[]
): number {
const allowed = new Set(
categories.map((category) =>
category.toUpperCase()
)
);

return events.filter(
(event) =>
event.team_id === teamId &&
allowed.has(
upper(event.event_category)
)
).length;
}

function calculateTeamStats(
events: EventRow[],
teamId: string
): TeamStats {
const ordinaryGoals = countCategory(
events,
teamId,
['GOAL']
);

const penaltyGoals = countCategory(
events,
teamId,
['PENALTY_GOAL']
);

const totalGoals =
ordinaryGoals + penaltyGoals;

const basicShots = countCategory(
events,
teamId,
['SHOT']
);

const directShotsOnTarget = countCategory(
events,
teamId,
['SHOT_ON_TARGET']
);

const missedShots = countCategory(
events,
teamId,
['MISSED_SHOT']
);

/*

* Goals and penalty goals are treated as successful shots.
*
* A separate SHOT event is only counted as another shot if
* that event was actually recorded separately by the scorekeeper.
  */
  const totalShots =
  basicShots +
  directShotsOnTarget +
  missedShots +
  ordinaryGoals +
  penaltyGoals;

const shotsOnTarget =
directShotsOnTarget +
ordinaryGoals +
penaltyGoals;

return {
goals: totalGoals,

totalShots,

shotsOnTarget,

shotsOffTarget: missedShots,

saves: countCategory(
  events,
  teamId,
  ['GOALKEEPER_SAVE']
),

steals: countCategory(
  events,
  teamId,
  ['STEAL', 'INTERCEPTION']
),

turnovers: countCategory(
  events,
  teamId,
  ['TURNOVER']
),

blocks: countCategory(
  events,
  teamId,
  ['BLOCK']
),

exclusionsDrawn: countCategory(
  events,
  teamId,
  [
    'EXCLUSION_EARNED',
    'EXCLUSION_DRAWN',
  ]
),

exclusionsCommitted: countCategory(
  events,
  teamId,
  ['EXCLUSION_COMMITTED']
),

penaltiesTaken: countCategory(
  events,
  teamId,
  [
    'PENALTY',
    'PENALTY_GOAL',
    'PENALTY_MISSED',
  ]
),

penaltiesScored: penaltyGoals,

penaltiesMissed: countCategory(
  events,
  teamId,
  ['PENALTY_MISSED']
),

};
}

function percentage(
numerator: number,
denominator: number
): number {
if (denominator <= 0) {
return 0;
}

return (numerator / denominator) * 100;
}

function drawText(
page: any,
text: string,
x: number,
y: number,
size: number,
font: any,
color: any
) {
page.drawText(String(text), {
x,
y,
size,
font,
color,
});
}

function drawSectionTitle(
page: any,
title: string,
x: number,
y: number,
boldFont: any
): number {
drawText(
page,
title,
x,
y,
11,
boldFont,
COLORS.green
);

page.drawLine({
start: {
x,
y: y - 6,
},
end: {
x: PAGE_WIDTH - 32,
y: y - 6,
},
thickness: 1,
color: COLORS.border,
});

return y - 24;
}

function drawMetricCard(
page: any,
label: string,
value: string,
x: number,
y: number,
width: number,
boldFont: any
) {
page.drawRectangle({
x,
y: y - 58,
width,
height: 58,
color: COLORS.light,
borderColor: COLORS.border,
borderWidth: 1,
});

drawText(
page,
label.toUpperCase(),
x + 10,
y - 17,
7,
boldFont,
COLORS.slate
);

drawText(
page,
value,
x + 10,
y - 43,
16,
boldFont,
COLORS.dark
);
}

function drawStatTable(
page: any,
rows: Array<{
label: string;
home: string;
away: string;
}>,
homeName: string,
awayName: string,
x: number,
y: number,
regularFont: any,
boldFont: any
) {
const labelWidth = 215;
const valueWidth = 80;
const rowHeight = 22;
const totalWidth =
labelWidth +
valueWidth +
valueWidth;

page.drawRectangle({
x,
y: y - rowHeight,
width: totalWidth,
height: rowHeight,
color: COLORS.green,
});

drawText(
page,
'STATISTIC',
x + 8,
y - 14,
7,
boldFont,
COLORS.white
);

drawText(
page,
homeName.slice(0, 13),
x + labelWidth + 5,
y - 14,
7,
boldFont,
COLORS.white
);

drawText(
page,
awayName.slice(0, 13),
x +
labelWidth +
valueWidth +
5,
y - 14,
7,
boldFont,
COLORS.white
);

let currentY = y - rowHeight;

rows.forEach((row, index) => {
page.drawRectangle({
x,
y: currentY - rowHeight,
width: totalWidth,
height: rowHeight,
color:
index % 2 === 0
? COLORS.white
: COLORS.light,
borderColor: COLORS.border,
borderWidth: 0.5,
});

drawText(
  page,
  row.label,
  x + 8,
  currentY - 14,
  8,
  regularFont,
  COLORS.dark
);

drawText(
  page,
  row.home,
  x + labelWidth + 5,
  currentY - 14,
  8,
  boldFont,
  COLORS.dark
);

drawText(
  page,
  row.away,
  x +
    labelWidth +
    valueWidth +
    5,
  currentY - 14,
  8,
  boldFont,
  COLORS.dark
);

currentY -= rowHeight;

});
}

function drawBarChart(
page: any,
title: string,
labels: string[],
homeValues: number[],
awayValues: number[],
homeName: string,
awayName: string,
x: number,
y: number,
width: number,
height: number,
regularFont: any,
boldFont: any
) {
page.drawRectangle({
x,
y: y - height,
width,
height,
color: COLORS.white,
borderColor: COLORS.border,
borderWidth: 1,
});

drawText(
page,
title,
x + 14,
y - 20,
11,
boldFont,
COLORS.green
);

const chartX = x + 42;
const chartY = y - 50;
const chartWidth = width - 58;
const chartHeight = height - 80;

const maxValue = Math.max(
...homeValues,
...awayValues,
1
);

const groupWidth =
chartWidth /
Math.max(labels.length, 1);

labels.forEach((label, index) => {
const homeValue =
homeValues[index] ?? 0;

const awayValue =
  awayValues[index] ?? 0;

const baseX =
  chartX +
  index * groupWidth;

const barWidth = Math.min(
  20,
  groupWidth / 3
);

const homeHeight =
  (homeValue / maxValue) *
  chartHeight;

const awayHeight =
  (awayValue / maxValue) *
  chartHeight;

page.drawRectangle({
  x: baseX + 2,
  y: chartY,
  width: barWidth,
  height: homeHeight,
  color: COLORS.green,
});

page.drawRectangle({
  x:
    baseX +
    barWidth +
    6,
  y: chartY,
  width: barWidth,
  height: awayHeight,
  color: COLORS.ochre,
});

drawText(
  page,
  label,
  baseX,
  chartY - 15,
  6.5,
  regularFont,
  COLORS.slate
);

if (homeValue > 0) {
  drawText(
    page,
    String(homeValue),
    baseX + 2,
    chartY +
      homeHeight +
      4,
    6,
    boldFont,
    COLORS.green
  );
}

if (awayValue > 0) {
  drawText(
    page,
    String(awayValue),
    baseX +
      barWidth +
      6,
    chartY +
      awayHeight +
      4,
    6,
    boldFont,
    COLORS.ochre
  );
}

});

page.drawRectangle({
x: x + 14,
y: y - height + 12,
width: 8,
height: 8,
color: COLORS.green,
});

drawText(
page,
homeName.slice(0, 18),
x + 27,
y - height + 13,
6.5,
regularFont,
COLORS.slate
);

page.drawRectangle({
x: x + width / 2,
y: y - height + 12,
width: 8,
height: 8,
color: COLORS.ochre,
});

drawText(
page,
awayName.slice(0, 18),
x +
width / 2 +
13,
y - height + 13,
6.5,
regularFont,
COLORS.slate
);
}

function drawLineChart(
page: any,
title: string,
homeValues: number[],
awayValues: number[],
x: number,
y: number,
width: number,
height: number,
regularFont: any,
boldFont: any
) {
page.drawRectangle({
x,
y: y - height,
width,
height,
color: COLORS.white,
borderColor: COLORS.border,
borderWidth: 1,
});

drawText(
page,
title,
x + 14,
y - 20,
11,
boldFont,
COLORS.green
);

const chartX = x + 42;
const chartY = y - 50;
const chartWidth = width - 60;
const chartHeight = height - 78;

const numberOfPoints =
Math.max(
homeValues.length,
awayValues.length,
1
);

const maxValue = Math.max(
...homeValues,
...awayValues,
1
);

const stepX =
numberOfPoints > 1
? chartWidth /
(numberOfPoints - 1)
: 0;

const drawSeries = (
values: number[],
color: any
) => {
for (
let index = 0;
index < values.length - 1;
index += 1
) {
const x1 =
chartX +
stepX * index;

  const x2 =
    chartX +
    stepX *
      (index + 1);

  const y1 =
    chartY +
    (values[index] /
      maxValue) *
      chartHeight;

  const y2 =
    chartY +
    (values[index + 1] /
      maxValue) *
      chartHeight;

  page.drawLine({
    start: {
      x: x1,
      y: y1,
    },
    end: {
      x: x2,
      y: y2,
    },
    thickness: 2,
    color,
  });
}

values.forEach(
  (value, index) => {
    const pointX =
      chartX +
      stepX * index;

    const pointY =
      chartY +
      (value /
        maxValue) *
        chartHeight;

    page.drawCircle({
      x: pointX,
      y: pointY,
      size: 3,
      color,
    });
  }
);

};

drawSeries(
homeValues,
COLORS.green
);

drawSeries(
awayValues,
COLORS.ochre
);

const quarterLabels = [
'Q1',
'Q2',
'Q3',
'Q4',
];

quarterLabels.forEach(
(label, index) => {
if (
index >=
numberOfPoints
) {
return;
}

  const labelX =
    chartX +
    stepX * index -
    5;

  drawText(
    page,
    label,
    labelX,
    chartY - 15,
    7,
    regularFont,
    COLORS.slate
  );
}

);

page.drawCircle({
x: x + 14,
y: y - height + 14,
size: 4,
color: COLORS.green,
});

drawText(
page,
'Home team',
x + 25,
y - height + 11,
6.5,
regularFont,
COLORS.slate
);

page.drawCircle({
x: x + width / 2,
y: y - height + 14,
size: 4,
color: COLORS.ochre,
});

drawText(
page,
'Away team',
x +
width / 2 +
11,
y - height + 11,
6.5,
regularFont,
COLORS.slate
);
}

function drawFooter(
page: any,
regularFont: any,
boldFont: any,
pageNumber: number
) {
drawText(
page,
'VELDT ANALYTICS',
32,
23,
7,
boldFont,
COLORS.green
);

drawText(
page,
'Match report generated from recorded match data.',
145,
23,
7,
regularFont,
COLORS.slate
);

drawText(
page,
`Page ${pageNumber}`,
PAGE_WIDTH - 70,
23,
7,
regularFont,
COLORS.slate
);
}

export async function GET(
request: Request,
{
params,
}: {
params: {
matchId: string;
};
}
) {
try {
const matchId =
params.matchId;

if (!matchId) {
  return NextResponse.json(
    {
      error:
        'Match ID is required.',
    },
    {
      status: 400,
    }
  );
}

const supabase =
  await createServerSupabase();

// -------------------------------------------------------
// LOAD MATCH
// -------------------------------------------------------

const {
  data: matchData,
  error: matchError,
} = await supabase
  .from('matches')
  .select(
    `
      id,
      tournament_id,
      pool_group_id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      period,
      status,
      scheduled_time,
      pool_location,
      round_type,
      match_number,
      completed_at
    `
  )
  .eq(
    'id',
    matchId
  )
  .maybeSingle();

if (matchError) {
  console.error(
    'Match report match query failed:',
    matchError
  );

  return NextResponse.json(
    {
      error:
        'Unable to load the match.',
    },
    {
      status: 500,
    }
  );
}

if (!matchData) {
  return NextResponse.json(
    {
      error:
        'Match not found.',
    },
    {
      status: 404,
    }
  );
}

const match =
  matchData as MatchRow;

if (
  !isCompleted(
    match.status
  )
) {
  return NextResponse.json(
    {
      error:
        'A match report is only available after the match has been completed.',
    },
    {
      status: 409,
    }
  );
}

if (
  !match.home_team_id ||
  !match.away_team_id
) {
  return NextResponse.json(
    {
      error:
        'Both teams must be assigned before generating a match report.',
    },
    {
      status: 422,
    }
  );
}

// -------------------------------------------------------
// LOAD RELATED DATA
// -------------------------------------------------------

const [
  homeTeamResult,
  awayTeamResult,
  tournamentResult,
  poolResult,
  eventsResult,
] = await Promise.all([
  supabase
    .from('teams')
    .select(
      'id,name,province,city'
    )
    .eq(
      'id',
      match.home_team_id
    )
    .maybeSingle(),

  supabase
    .from('teams')
    .select(
      'id,name,province,city'
    )
    .eq(
      'id',
      match.away_team_id
    )
    .maybeSingle(),

  match.tournament_id
    ? supabase
        .from('tournaments')
        .select(
          'id,name,competition_category,start_date,end_date,location'
        )
        .eq(
          'id',
          match.tournament_id
        )
        .maybeSingle()
    : Promise.resolve({
        data: null,
        error: null,
      }),

  match.pool_group_id
    ? supabase
        .from('pool_groups')
        .select(
          'id,name'
        )
        .eq(
          'id',
          match.pool_group_id
        )
        .maybeSingle()
    : Promise.resolve({
        data: null,
        error: null,
      }),

  supabase
    .from('match_events')
    .select(
      `
        id,
        period,
        game_clock,
        team_id,
        event_category,
        created_at
      `
    )
    .eq(
      'match_id',
      matchId
    )
    .order(
      'period',
      {
        ascending: true,
      }
    )
    .order(
      'game_clock',
      {
        ascending: false,
      }
    ),
]);

if (
  homeTeamResult.error ||
  awayTeamResult.error ||
  tournamentResult.error ||
  poolResult.error ||
  eventsResult.error
) {
  console.error(
    'Match report related query failed:',
    {
      homeTeam:
        homeTeamResult.error,
      awayTeam:
        awayTeamResult.error,
      tournament:
        tournamentResult.error,
      pool:
        poolResult.error,
      events:
        eventsResult.error,
    }
  );

  return NextResponse.json(
    {
      error:
        'Unable to load all of the information required for this report.',
    },
    {
      status: 500,
    }
  );
}

if (
  !homeTeamResult.data ||
  !awayTeamResult.data
) {
  return NextResponse.json(
    {
      error:
        'One or both teams could not be found.',
    },
    {
      status: 422,
    }
  );
}

const homeTeam =
  homeTeamResult.data as TeamRow;

const awayTeam =
  awayTeamResult.data as TeamRow;

const tournament =
  tournamentResult.data as
    | TournamentRow
    | null;

const pool =
  poolResult.data as
    | PoolRow
    | null;

const events =
  (eventsResult.data ??
    []) as EventRow[];

// -------------------------------------------------------
// CALCULATE STATISTICS
// -------------------------------------------------------

const homeStats =
  calculateTeamStats(
    events,
    homeTeam.id
  );

const awayStats =
  calculateTeamStats(
    events,
    awayTeam.id
  );

const homeScore =
  safeNumber(
    match.home_score
  );

const awayScore =
  safeNumber(
    match.away_score
  );

// -------------------------------------------------------
// QUARTER SCORING
// -------------------------------------------------------

const quarterScores =
  [1, 2, 3, 4].map(
    (quarter) => ({
      quarter,

      home:
        events.filter(
          (event) =>
            event.team_id ===
              homeTeam.id &&
            safeNumber(
              event.period
            ) === quarter &&
            [
              'GOAL',
              'PENALTY_GOAL',
            ].includes(
              upper(
                event.event_category
              )
            )
        ).length,

      away:
        events.filter(
          (event) =>
            event.team_id ===
              awayTeam.id &&
            safeNumber(
              event.period
            ) === quarter &&
            [
              'GOAL',
              'PENALTY_GOAL',
            ].includes(
              upper(
                event.event_category
              )
            )
        ).length,
    })
  );

// -------------------------------------------------------
// SCORE / EVENT VALIDATION
// -------------------------------------------------------

const eventHomeGoals =
  countCategory(
    events,
    homeTeam.id,
    [
      'GOAL',
      'PENALTY_GOAL',
    ]
  );

const eventAwayGoals =
  countCategory(
    events,
    awayTeam.id,
    [
      'GOAL',
      'PENALTY_GOAL',
    ]
  );

const statisticsReconciled =
  eventHomeGoals ===
    homeScore &&
  eventAwayGoals ===
    awayScore;

// -------------------------------------------------------
// CREATE PDF
// -------------------------------------------------------

const pdfDoc =
  await PDFDocument.create();

pdfDoc.setTitle(
  `${homeTeam.name} vs ${awayTeam.name} - Veldt Analytics Match Report`
);

pdfDoc.setAuthor(
  'Veldt Analytics'
);

pdfDoc.setSubject(
  'Water Polo Match Report'
);

pdfDoc.setCreator(
  'Veldt Analytics'
);

const regularFont =
  await pdfDoc.embedFont(
    StandardFonts.Helvetica
  );

const boldFont =
  await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  );

let logoImage: any =
  null;

try {
  const logoPath =
    path.join(
      process.cwd(),
      'public',
      'logos',
      'logo-icon.png'
    );

  const logoBytes =
    await fs.readFile(
      logoPath
    );

  logoImage =
    await pdfDoc.embedPng(
      new Uint8Array(
        logoBytes
      )
    );
} catch (error) {
  console.warn(
    'Could not load Veldt Analytics logo:',
    error
  );
}

// =======================================================
// PAGE 1 — MATCH SUMMARY
// =======================================================

{
  const page =
    pdfDoc.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  page.drawRectangle({
    x: 0,
    y:
      PAGE_HEIGHT -
      106,
    width:
      PAGE_WIDTH,
    height: 106,
    color: COLORS.dark,
  });

  if (logoImage) {
    page.drawImage(
      logoImage,
      {
        x: 32,
        y:
          PAGE_HEIGHT -
          84,
        width: 48,
        height: 48,
      }
    );
  }

  drawText(
    page,
    'VELDT ANALYTICS',
    92,
    PAGE_HEIGHT - 44,
    18,
    boldFont,
    COLORS.white
  );

  drawText(
    page,
    'WATER POLO MATCH REPORT',
    92,
    PAGE_HEIGHT - 65,
    9,
    regularFont,
    COLORS.ochre
  );

  drawText(
    page,
    tournament?.name ??
      'Water Polo Tournament',
    32,
    PAGE_HEIGHT - 137,
    10,
    boldFont,
    COLORS.green
  );

  const matchLabel =
    [
      pool?.name,
      match.match_number
        ? `Match ${match.match_number}`
        : null,
      match.round_type,
    ]
      .filter(Boolean)
      .join('  |  ') ||
    'Completed Match';

  drawText(
    page,
    matchLabel,
    32,
    PAGE_HEIGHT - 155,
    8,
    regularFont,
    COLORS.slate
  );

  const scorePanelTop =
    PAGE_HEIGHT - 188;

  const scorePanelBottom =
    PAGE_HEIGHT - 320;

  page.drawRectangle({
    x: 32,
    y: scorePanelBottom,
    width:
      PAGE_WIDTH - 64,
    height:
      scorePanelTop -
      scorePanelBottom,
    color:
      COLORS.light,
    borderColor:
      COLORS.border,
    borderWidth: 1,
  });

  drawText(
    page,
    homeTeam.name,
    55,
    scorePanelTop - 33,
    16,
    boldFont,
    COLORS.green
  );

  drawText(
    page,
    awayTeam.name,
    350,
    scorePanelTop - 33,
    16,
    boldFont,
    COLORS.green
  );

  drawText(
    page,
    String(homeScore),
    105,
    scorePanelBottom + 29,
    42,
    boldFont,
    homeScore >
      awayScore
      ? COLORS.ochre
      : COLORS.dark
  );

  drawText(
    page,
    String(awayScore),
    400,
    scorePanelBottom + 29,
    42,
    boldFont,
    awayScore >
      homeScore
      ? COLORS.ochre
      : COLORS.dark
  );

  drawText(
    page,
    'FINAL',
    277,
    scorePanelBottom + 63,
    10,
    boldFont,
    COLORS.red
  );

  let y =
    PAGE_HEIGHT - 350;

  y = drawSectionTitle(
    page,
    'MATCH INFORMATION',
    32,
    y,
    boldFont
  );

  const infoRows = [
    [
      'Competition',
      tournament?.competition_category ??
        'Not recorded',
    ],
    [
      'Date',
      formatDate(
        match.completed_at ??
          match.scheduled_time
      ),
    ],
    [
      'Scheduled',
      formatDateTime(
        match.scheduled_time
      ),
    ],
    [
      'Venue',
      match.pool_location ??
        tournament?.location ??
        'Not recorded',
    ],
    [
      'Pool',
      pool?.name ??
        'Not assigned',
    ],
    [
      'Status',
      upper(
        match.status
      ) || 'COMPLETED',
    ],
  ];

  infoRows.forEach(
    ([label, value]) => {
      drawText(
        page,
        label,
        38,
        y,
        8,
        boldFont,
        COLORS.slate
      );

      drawText(
        page,
        value,
        150,
        y,
        8,
        regularFont,
        COLORS.dark
      );

      y -= 18;
    }
  );

  y -= 2;

  y = drawSectionTitle(
    page,
    'SCORING BY QUARTER',
    32,
    y,
    boldFont
  );

  const tableX = 32;
  const tableWidth =
    PAGE_WIDTH - 64;
  const firstColumn = 215;
  const numericColumn =
    (tableWidth -
      firstColumn) /
    5;
  const rowHeight = 22;

  page.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: COLORS.green,
  });

  [
    'TEAM',
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'FINAL',
  ].forEach(
    (header, index) => {
      const x =
        index === 0
          ? tableX + 8
          : tableX +
            firstColumn +
            (index - 1) *
              numericColumn +
            8;

      drawText(
        page,
        header,
        x,
        y - 14,
        7,
        boldFont,
        COLORS.white
      );
    }
  );

  const quarterRows = [
    {
      name:
        homeTeam.name,
      quarters:
        quarterScores.map(
          (item) =>
            item.home
        ),
      final:
        homeScore,
    },
    {
      name:
        awayTeam.name,
      quarters:
        quarterScores.map(
          (item) =>
            item.away
        ),
      final:
        awayScore,
    },
  ];

  let rowY =
    y - rowHeight;

  quarterRows.forEach(
    (row, rowIndex) => {
      page.drawRectangle({
        x: tableX,
        y:
          rowY -
          rowHeight,
        width:
          tableWidth,
        height:
          rowHeight,
        color:
          rowIndex % 2 ===
          0
            ? COLORS.white
            : COLORS.light,
        borderColor:
          COLORS.border,
        borderWidth: 0.5,
      });

      drawText(
        page,
        row.name,
        tableX + 8,
        rowY - 14,
        8,
        boldFont,
        COLORS.dark
      );

      row.quarters.forEach(
        (
          value,
          index
        ) => {
          drawText(
            page,
            String(value),
            tableX +
              firstColumn +
              index *
                numericColumn +
              8,
            rowY - 14,
            8,
            boldFont,
            COLORS.dark
          );
        }
      );

      drawText(
        page,
        String(row.final),
        tableX +
          firstColumn +
          4 *
            numericColumn +
          8,
        rowY - 14,
        8,
        boldFont,
        row.final >
          (rowIndex === 0
            ? awayScore
            : homeScore)
          ? COLORS.ochre
          : COLORS.dark
      );

      rowY -= rowHeight;
    }
  );

  const validationY =
    rowY - 22;

  page.drawRectangle({
    x: 32,
    y:
      validationY - 40,
    width:
      PAGE_WIDTH - 64,
    height: 40,
    color:
      statisticsReconciled
        ? COLORS.successBackground
        : COLORS.warningBackground,
    borderColor:
      statisticsReconciled
        ? COLORS.successBorder
        : COLORS.warningBorder,
    borderWidth: 1,
  });

  drawText(
    page,
    statisticsReconciled
      ? 'STATISTICS VALIDATED'
      : 'STATISTICS WARNING',
    43,
    validationY - 16,
    8,
    boldFont,
    statisticsReconciled
      ? COLORS.green
      : COLORS.red
  );

  drawText(
    page,
    statisticsReconciled
      ? 'Recorded scoring events reconcile with the official final score.'
      : 'Recorded scoring events do not fully reconcile with the official final score.',
    43,
    validationY - 30,
    7,
    regularFont,
    COLORS.slate
  );

  drawFooter(
    page,
    regularFont,
    boldFont,
    1
  );
}

// =======================================================
// PAGE 2 — TEAM STATISTICS
// =======================================================

{
  const page =
    pdfDoc.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  page.drawRectangle({
    x: 0,
    y:
      PAGE_HEIGHT - 76,
    width:
      PAGE_WIDTH,
    height: 76,
    color: COLORS.dark,
  });

  drawText(
    page,
    'TEAM STATISTICS',
    32,
    PAGE_HEIGHT - 44,
    18,
    boldFont,
    COLORS.white
  );

  drawText(
    page,
    `${homeTeam.name} vs ${awayTeam.name}`,
    32,
    PAGE_HEIGHT - 61,
    8,
    regularFont,
    COLORS.ochre
  );

  let y =
    PAGE_HEIGHT - 104;

  const cardGap = 10;

  const cardWidth =
    (PAGE_WIDTH -
      64 -
      cardGap * 2) /
    3;

  drawMetricCard(
    page,
    'Home Goals',
    String(homeScore),
    32,
    y,
    cardWidth,
    boldFont
  );

  drawMetricCard(
    page,
    'Away Goals',
    String(awayScore),
    32 +
      cardWidth +
      cardGap,
    y,
    cardWidth,
    boldFont
  );

  drawMetricCard(
    page,
    'Combined Goals',
    String(
      homeScore +
        awayScore
    ),
    32 +
      (cardWidth +
        cardGap) *
        2,
    y,
    cardWidth,
    boldFont
  );

  y -= 82;

  y = drawSectionTitle(
    page,
    'STATISTICAL COMPARISON',
    32,
    y,
    boldFont
  );

  drawStatTable(
    page,
    [
      {
        label: 'Goals',
        home: String(
          homeStats.goals
        ),
        away: String(
          awayStats.goals
        ),
      },
      {
        label: 'Total Shots',
        home: String(
          homeStats.totalShots
        ),
        away: String(
          awayStats.totalShots
        ),
      },
      {
        label:
          'Shots on Target',
        home: String(
          homeStats.shotsOnTarget
        ),
        away: String(
          awayStats.shotsOnTarget
        ),
      },
      {
        label:
          'Shots off Target',
        home: String(
          homeStats.shotsOffTarget
        ),
        away: String(
          awayStats.shotsOffTarget
        ),
      },
      {
        label:
          'Shooting %',
        home: `${percentage(
          homeStats.goals,
          homeStats.totalShots
        ).toFixed(1)}%`,
        away: `${percentage(
          awayStats.goals,
          awayStats.totalShots
        ).toFixed(1)}%`,
      },
      {
        label:
          'Goalkeeper Saves',
        home: String(
          homeStats.saves
        ),
        away: String(
          awayStats.saves
        ),
      },
      {
        label:
          'Steals / Interceptions',
        home: String(
          homeStats.steals
        ),
        away: String(
          awayStats.steals
        ),
      },
      {
        label:
          'Turnovers',
        home: String(
          homeStats.turnovers
        ),
        away: String(
          awayStats.turnovers
        ),
      },
      {
        label:
          'Blocks',
        home: String(
          homeStats.blocks
        ),
        away: String(
          awayStats.blocks
        ),
      },
      {
        label:
          'Exclusions Drawn',
        home: String(
          homeStats.exclusionsDrawn
        ),
        away: String(
          awayStats.exclusionsDrawn
        ),
      },
      {
        label:
          'Exclusions Committed',
        home: String(
          homeStats.exclusionsCommitted
        ),
        away: String(
          awayStats.exclusionsCommitted
        ),
      },
      {
        label:
          'Penalties Taken',
        home: String(
          homeStats.penaltiesTaken
        ),
        away: String(
          awayStats.penaltiesTaken
        ),
      },
      {
        label:
          'Penalty Goals',
        home: String(
          homeStats.penaltiesScored
        ),
        away: String(
          awayStats.penaltiesScored
        ),
      },
      {
        label:
          'Penalty Conversion',
        home: `${percentage(
          homeStats.penaltiesScored,
          homeStats.penaltiesTaken
        ).toFixed(1)}%`,
        away: `${percentage(
          awayStats.penaltiesScored,
          awayStats.penaltiesTaken
        ).toFixed(1)}%`,
      },
    ],
    homeTeam.name,
    awayTeam.name,
    32,
    y,
    regularFont,
    boldFont
  );

  drawFooter(
    page,
    regularFont,
    boldFont,
    2
  );
}

// =======================================================
// PAGE 3 — VISUAL ANALYTICS
// =======================================================

{
  const page =
    pdfDoc.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  page.drawRectangle({
    x: 0,
    y:
      PAGE_HEIGHT - 76,
    width:
      PAGE_WIDTH,
    height: 76,
    color: COLORS.dark,
  });

  drawText(
    page,
    'MATCH ANALYTICS',
    32,
    PAGE_HEIGHT - 44,
    18,
    boldFont,
    COLORS.white
  );

  drawText(
    page,
    'Visual comparison of recorded team performance',
    32,
    PAGE_HEIGHT - 61,
    8,
    regularFont,
    COLORS.ochre
  );

  drawBarChart(
    page,
    'SHOOTING & SCORING',
    [
      'Goals',
      'Shots',
      'On Target',
      'Off Target',
    ],
    [
      homeStats.goals,
      homeStats.totalShots,
      homeStats.shotsOnTarget,
      homeStats.shotsOffTarget,
    ],
    [
      awayStats.goals,
      awayStats.totalShots,
      awayStats.shotsOnTarget,
      awayStats.shotsOffTarget,
    ],
    homeTeam.name,
    awayTeam.name,
    32,
    PAGE_HEIGHT - 100,
    PAGE_WIDTH - 64,
    235,
    regularFont,
    boldFont
  );

  drawBarChart(
    page,
    'DEFENSIVE ACTIVITY',
    [
      'Saves',
      'Steals',
      'Turnovers',
      'Blocks',
    ],
    [
      homeStats.saves,
      homeStats.steals,
      homeStats.turnovers,
      homeStats.blocks,
    ],
    [
      awayStats.saves,
      awayStats.steals,
      awayStats.turnovers,
      awayStats.blocks,
    ],
    homeTeam.name,
    awayTeam.name,
    32,
    PAGE_HEIGHT - 355,
    PAGE_WIDTH - 64,
    235,
    regularFont,
    boldFont
  );

  drawLineChart(
    page,
    'GOALS BY QUARTER',
    quarterScores.map(
      (item) =>
        item.home
    ),
    quarterScores.map(
      (item) =>
        item.away
    ),
    32,
    PAGE_HEIGHT - 610,
    PAGE_WIDTH - 64,
    175,
    regularFont,
    boldFont
  );

  drawFooter(
    page,
    regularFont,
    boldFont,
    3
  );
}

// -------------------------------------------------------
// RETURN PDF
// -------------------------------------------------------

const pdfBytes =
  await pdfDoc.save();

const homeSlug =
  cleanFileName(
    homeTeam.name
  );

const awaySlug =
  cleanFileName(
    awayTeam.name
  );

const filename =
  `veldt-match-report-${homeSlug}-vs-${awaySlug}-${matchId.slice(
    0,
    8
  )}.pdf`;

return new NextResponse(
  Uint8Array.from(pdfBytes),
  {
    status: 200,
    headers: {
      'Content-Type':
        'application/pdf',
      'Content-Disposition':
        `attachment; filename="${filename}"`,
      'Cache-Control':
        'private, no-store, max-age=0',
    },
  }
);


} catch (error) {
console.error(
'Match report generation failed:',
error
);

return NextResponse.json(
  {
    error:
      'Failed to generate the match report.',
  },
  {
    status: 500,
  }
);

}
}
