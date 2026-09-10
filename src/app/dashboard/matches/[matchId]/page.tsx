'use client';

import React, {
useEffect,
useState,
} from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabaseClient';

import DownloadMatchReportButton from '@/components/DownloadMatchReportButton';

type Team = {
id: string;
name: string;
province?: string | null;
};

type Match = {
id: string;
tournament_id: string | null;
pool_group_id: string | null;

home_team_id: string | null;
away_team_id: string | null;

home_score: number | null;
away_score: number | null;

period: number | null;
period_clock_seconds: number | null;

shot_clock_seconds: number | null;

is_running: boolean | null;
status: string | null;

scheduled_time: string | null;

home_team: Team | Team[] | null;
away_team: Team | Team[] | null;
};

type Event = {
id: string;
match_id: string;
team_id: string | null;
event_category: string;
created_at?: string;
};

function getTeam(
value: Team | Team[] | null | undefined
) {
if (!value) {
return null;
}

return Array.isArray(value)
? value[0] ?? null
: value;
}

function formatClock(
seconds: number | null | undefined
) {
const total = Math.max(
0,
Number(seconds ?? 0)
);

const minutes = Math.floor(
total / 60
);

const remaining =
total % 60;

return `${String(minutes).padStart(
    2,
    '0'
  )}:${String(
    remaining
  ).padStart(2, '0')}`;
}

function isCompletedStatus(
status: string | null | undefined
) {
return [
'COMPLETED',
'FINAL',
'FINISHED',
].includes(
String(status ?? '')
.toUpperCase()
);
}

function formatEventCategory(
value: string
) {
return value
.replace(/_/g, ' ')
.toLowerCase()
.replace(/\b\w/g, (character) =>
character.toUpperCase()
);
}

export default function PublicMatchPage() {
const params = useParams();

const matchId =
typeof params?.matchId ===
'string'
? params.matchId
: '';

const [match, setMatch] =
useState<Match | null>(null);

const [events, setEvents] =
useState<Event[]>([]);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState<string | null>(null);

useEffect(() => {
if (!matchId) {
return;
}

let mounted = true;

const loadMatch =
  async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data,
        error,
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
          period_clock_seconds,
          shot_clock_seconds,
          is_running,
          status,
          scheduled_time,

          home_team:teams!matches_home_team_id_fkey(
            id,
            name,
            province
          ),

          away_team:teams!matches_away_team_id_fkey(
            id,
            name,
            province
          )
        `
        )
        .eq(
          'id',
          matchId
        )
        .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (!data) {
        throw new Error(
          'Match not found.'
        );
      }

      const {
        data: eventData,
        error: eventError,
      } =
        await supabase
          .from('match_events')
          .select(
            `
            id,
            match_id,
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
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(20);

      if (eventError) {
        throw new Error(
          eventError.message
        );
      }

      if (!mounted) {
        return;
      }

      setMatch(
        data as Match
      );

      setEvents(
        (eventData ??
          []) as Event[]
      );
    } catch (err) {
      console.error(err);

      if (!mounted) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load match.'
      );
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

loadMatch();

const channel =
  supabase
    .channel(
      `public-match-${matchId}`
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        setMatch(
          (current) =>
            current
              ? {
                  ...current,
                  ...(payload.new as Partial<Match>),
                }
              : current
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'match_events',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const newEvent =
          payload.new as Event;

        setEvents(
          (current) =>
            [
              newEvent,
              ...current.filter(
                (event) =>
                  event.id !==
                  newEvent.id
              ),
            ].slice(
              0,
              20
            )
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'match_events',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const deletedId =
          String(
            (
              payload.old as {
                id?: string;
              }
            )?.id ?? ''
          );

        if (!deletedId) {
          return;
        }

        setEvents(
          (current) =>
            current.filter(
              (event) =>
                event.id !==
                deletedId
            )
        );
      }
    )
    .subscribe();

return () => {
  mounted = false;

  supabase.removeChannel(
    channel
  );
};

}, [matchId]);

if (loading) {
return ( <PageShell> <Loading /> </PageShell>
);
}

if (error || !match) {
return ( <PageShell> <section className="rounded-3xl border bg-white p-8 shadow-sm">
<h1
className="text-2xl font-black"
style={{
color:
'var(--veldt-green)',
}}
>
Unable to load match </h1>

      <p className="mt-2 text-sm text-red-600">
        {error ??
          'Match not found.'}
      </p>

      <Link
        href="/dashboard"
        className="mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-black text-white"
        style={{
          background:
            'var(--veldt-green)',
        }}
      >
        Back to Dashboard
      </Link>
    </section>
  </PageShell>
);

}

const home =
getTeam(match.home_team);

const away =
getTeam(match.away_team);

const homeScore =
Number(
match.home_score ?? 0
);

const awayScore =
Number(
match.away_score ?? 0
);

const live =
match.is_running === true ||
[
'LIVE',
'IN_PROGRESS',
'RUNNING',
'PLAYING',
].includes(
String(
match.status ?? ''
).toUpperCase()
);

const completed =
isCompletedStatus(
match.status
);

return ( <PageShell> <div className="space-y-6"> <section className="rounded-[32px] border bg-white shadow-sm"> <div className="p-5 md:p-8"> <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"> <div>
<Link
href="/dashboard"
className="text-xs font-black uppercase tracking-[0.2em]"
style={{
color:
'var(--veldt-ochre)',
}}
>
← Water Polo Stats </Link>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {live
                ? 'Live Match'
                : completed
                  ? 'Completed Match'
                  : 'Match Centre'}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black ${
              live
                ? 'bg-red-100 text-red-700'
                : completed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {live
              ? '● LIVE'
              : String(
                  match.status ??
                    'COMPLETED'
                ).toUpperCase()}
          </span>
        </div>

        <div className="mt-8 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <TeamBox
            team={home}
            score={homeScore}
            align="left"
          />

          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              {live
                ? `Q${match.period ?? 1}`
                : 'FINAL'}
            </p>

            {live && (
              <p
                className="mt-1 text-2xl font-black"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                {formatClock(
                  match.period_clock_seconds
                )}
              </p>
            )}

            {live &&
              match.shot_clock_seconds !==
                null && (
                <p className="mt-1 text-xs text-slate-400">
                  Shot{' '}
                  {formatClock(
                    match.shot_clock_seconds
                  )}
                </p>
              )}
          </div>

          <TeamBox
            team={away}
            score={awayScore}
            align="right"
          />
        </div>

        {completed && (
          <div className="mt-8 border-t pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.18em]"
                  style={{
                    color:
                      'var(--veldt-ochre)',
                  }}
                >
                  Match Report
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Download the completed match statistics as a Veldt Analytics PDF.
                </p>
              </div>

              <DownloadMatchReportButton
                matchId={match.id}
              />
            </div>
          </div>
        )}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <StatPanel title="Match Statistics">
        <StatRow
          label="Score"
          value={`${homeScore} – ${awayScore}`}
        />

        <StatRow
          label="Status"
          value={
            match.status ??
            '—'
          }
        />

        <StatRow
          label="Period"
          value={`Q${match.period ?? 1}`}
        />

        <StatRow
          label="Scheduled"
          value={
            match.scheduled_time
              ? new Date(
                  match.scheduled_time
                ).toLocaleString(
                  'en-ZA'
                )
              : '—'
          }
        />
      </StatPanel>

      <StatPanel title="Recent Events">
        {!events.length ? (
          <p className="text-sm text-slate-500">
            No match events recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map(
              (event) => {
                const isHome =
                  event.team_id ===
                  match.home_team_id;

                const team =
                  isHome
                    ? home
                    : away;

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-black">
                        {formatEventCategory(
                          event.event_category
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        {team?.name ??
                          'Team'}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-slate-400">
                      {event.created_at
                        ? new Date(
                            event.created_at
                          ).toLocaleTimeString(
                            'en-ZA',
                            {
                              hour: '2-digit',
                              minute:
                                '2-digit',
                            }
                          )
                        : ''}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </StatPanel>
    </section>

    {home && (
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/dashboard/teams/${home.id}`}
          className="rounded-2xl border bg-white p-5 font-black shadow-sm hover:shadow-md"
          style={{
            color:
              'var(--veldt-green)',
          }}
        >
          View {home.name} profile →
        </Link>

        {away && (
          <Link
            href={`/dashboard/teams/${away.id}`}
            className="rounded-2xl border bg-white p-5 font-black shadow-sm hover:shadow-md"
            style={{
              color:
                'var(--veldt-green)',
            }}
          >
            View {away.name} profile →
          </Link>
        )}
      </section>
    )}

    {completed && (
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            >
              Veldt Analytics
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Official Match Report
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Includes the final score, quarter scoring, team statistics and performance charts.
            </p>
          </div>

          <DownloadMatchReportButton
            matchId={match.id}
          />
        </div>
      </section>
    )}
  </div>
</PageShell>

);
}

function PageShell({
children,
}: {
children: React.ReactNode;
}) {
return (
<div
className="min-h-screen"
style={{
background:
'var(--bg-soft)',
color: '#0F172A',
}}
> <header className="border-b bg-white"> <div className="mx-auto max-w-7xl px-4 py-4 md:px-6"> <div className="flex items-center justify-between">
<Link
href="/"
className="font-black"
style={{
color:
'var(--veldt-green)',
}}
>
Veldt Analytics </Link>

        <Link
          href="/dashboard"
          className="text-sm font-bold text-slate-500 hover:text-slate-900"
        >
          Dashboard
        </Link>
      </div>
    </div>
  </header>

  <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
    {children}
  </main>
</div>

);
}

function TeamBox({
team,
score,
align,
}: {
team: Team | null;
score: number;
align: 'left' | 'right';
}) {
return (
<div
className={
align === 'right'
? 'text-right'
: 'text-left'
}
> <p className="text-sm font-black uppercase tracking-wider text-slate-400">
{team?.province ?? '—'} </p>

  <h1
    className="mt-1 text-2xl font-black md:text-4xl"
    style={{
      color:
        'var(--veldt-green)',
    }}
  >
    {team?.name ?? 'TBD'}
  </h1>

  <p
    className="mt-3 text-5xl font-black md:text-7xl"
    style={{
      color:
        'var(--veldt-green)',
    }}
  >
    {score}
  </p>
</div>

);
}

function StatPanel({
title,
children,
}: {
title: string;
children: React.ReactNode;
}) {
return ( <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6"> <h2 className="text-xl font-black">
{title} </h2>

  <div className="mt-4">
    {children}
  </div>
</section>

);
}

function StatRow({
label,
value,
}: {
label: string;
value: string;
}) {
return ( <div className="flex items-center justify-between border-b py-3 last:border-0"> <span className="text-sm text-slate-500">
{label} </span>

  <span className="text-sm font-black">
    {value}
  </span>
</div>


);
}

function Loading() {
return ( <section className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
Loading match... </section>
);
}
