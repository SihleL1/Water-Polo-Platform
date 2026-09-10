'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

import { Pause, Play } from 'lucide-react';

import { WaterPoloPossessionControl } from '@/components/PossessionControl';
import { WaterPoloEventTagger } from '@/components/EventTagger';

import GameClock, { type GameDuration } from '@/components/scorekeeper/GameClock';

import MatchStatus, {
  type Exclusion,
  type TeamTimeout,
} from '@/components/scorekeeper/MatchStatus';

import PlayerCapSelector from '@/components/scorekeeper/PlayerCapSelector';
import RecentActions, { type RecentAction } from '@/components/scorekeeper/RecentActions';

import Scoreboard from '@/components/scorekeeper/Scoreboard';
import TeamCard from '@/components/scorekeeper/TeamCard';

interface MatchProps {
  match: {
    id: string;

    home_team_id: string;
    away_team_id: string;

    home_team_name: string;
    away_team_name: string;

    home_cap_color: 'white' | 'blue' | 'dark';

    away_cap_color: 'white' | 'blue' | 'dark';

    home_score: number;
    away_score: number;

    period: number;

    status?: string;
  };
}

export default function ScorekeeperConsole({ match }: MatchProps) {
  /* =========================================================
     MATCH STATE
  ========================================================= */

  const [homeScore, setHomeScore] = useState(match.home_score ?? 0);

  const [awayScore, setAwayScore] = useState(match.away_score ?? 0);

  const [period, setPeriod] = useState(match.period ?? 1);

  const [possession, recordPossessionChange] = useState<'home' | 'away'>('home');

  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');

  const [homeSelectedCap, setHomeSelectedCap] = useState<number | string>(1);

  const [awaySelectedCap, setAwaySelectedCap] = useState<number | string>(1);

  const [endingMatch, setEndingMatch] = useState(false);

  const [matchCompleted, setMatchCompleted] = useState(match.status === 'COMPLETED');

  /* =========================================================
     CAP COLORS
  ========================================================= */

  const [homeCapColor, setHomeCapColor] = useState<'white' | 'blue' | 'dark'>(
    match.home_cap_color || 'white'
  );

  const [awayCapColor, setAwayCapColor] = useState<'white' | 'blue' | 'dark'>(
    match.away_cap_color || 'blue'
  );

  /* =========================================================
     CLOCK STATE
  ========================================================= */

  const [gameDuration, setGameDuration] = useState<GameDuration>(8);

  const [periodClock, setPeriodClock] = useState(8 * 60);

  const [shotClock, setShotClock] = useState(30);

  const [possessionClock, setPossessionClock] = useState(30);

  const [isRunning, setIsRunning] = useState(false);

  /* =========================================================
     MATCH STATUS
  ========================================================= */

  const [exclusions, setExclusions] = useState<Exclusion[]>([]);

  const [timeouts, setTimeouts] = useState<TeamTimeout[]>([]);

  /* =========================================================
     RECENT ACTIONS
  ========================================================= */

  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

  /* =========================================================
     RECENT ACTIONS LOAD + REALTIME
  ========================================================= */

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadRecentActions = async () => {
      const { data, error } = await supabase
        .from('match_events')
        .select(
          `
          id,
          event_category,
          primary_player_cap,
          period,
          game_clock,
          team_id,
          created_at
        `
        )
        .eq('match_id', match.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading recent actions:', error);
        return;
      }

      setRecentActions((data ?? []) as RecentAction[]);
    };

    loadRecentActions();

    channel = supabase
      .channel(`recent-actions-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const newAction = payload.new as RecentAction;

          setRecentActions((current) => {
            const withoutDuplicate = current.filter((action) => action.id !== newAction.id);

            return [newAction, ...withoutDuplicate].slice(0, 20);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as Partial<RecentAction>)?.id;

          if (!deletedId) return;

          setRecentActions((current) => current.filter((action) => action.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [match.id]);

  /* =========================================================
     CLOCK ENGINE
  ========================================================= */

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setPeriodClock((previous) => Math.max(previous - 1, 0));

      setShotClock((previous) => Math.max(previous - 1, 0));

      setPossessionClock((previous) => Math.max(previous - 1, 0));

      setExclusions((previous) =>
        previous
          .map((exclusion) => ({
            ...exclusion,
            timeRemaining: exclusion.timeRemaining - 1,
          }))
          .filter((exclusion) => exclusion.timeRemaining > 0)
      );

      setTimeouts((previous) =>
        previous
          .map((timeout) => ({
            ...timeout,
            timeRemaining: timeout.timeRemaining - 1,
          }))
          .filter((timeout) => timeout.timeRemaining > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  /* =========================================================
     HELPERS
  ========================================================= */

  const getActionTeamName = useCallback(
    (teamId: string) => {
      if (teamId === match.home_team_id) {
        return match.home_team_name;
      }

      if (teamId === match.away_team_id) {
        return match.away_team_name;
      }

      return 'Unknown Team';
    },
    [match.home_team_id, match.away_team_id, match.home_team_name, match.away_team_name]
  );

  /* =========================================================
     DATABASE MATCH STATE
  ========================================================= */

  const updateMatchState = useCallback(
    async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from('matches').update(updates).eq('id', match.id);

      if (error) {
        console.error('Error updating match state:', error);
      }
    },
    [match.id]
  );

  /* =========================================================
     START / STOP
  ========================================================= */

  const toggleRunning = useCallback(
    async (next?: boolean) => {
      const newRunning = typeof next === 'boolean' ? next : !isRunning;

      setIsRunning(newRunning);

      await updateMatchState({
        is_running: newRunning,
      });
    },
    [isRunning, updateMatchState]
  );

  /* =========================================================
     KEYBOARD CONTROLS
  ========================================================= */

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        toggleRunning();
        return;
      }

      if (event.key.toLowerCase() === 'r') {
        setShotClock(30);
        setPossessionClock(30);
        return;
      }

      if (event.key.toLowerCase() === 'p') {
        recordPossessionChange((current) => (current === 'home' ? 'away' : 'home'));
        setPossessionClock(30);
      }
    },
    [toggleRunning]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  /* =========================================================
     POSSESSION
  ========================================================= */

  const changePossession = useCallback((team: 'home' | 'away', seconds = 30) => {
    recordPossessionChange(team);
    setPossessionClock(seconds);
    setShotClock(seconds);
  }, []);

  const setPossession = async (
nextTeam: 'home' | 'away' | null
) => {
try {
if (!nextTeam) {
return;
}

const nextTeamId =
  nextTeam === 'home'
    ? match.home_team_id
    : match.away_team_id;

if (!nextTeamId) {
  return;
}

/*
 * Record the end of the previous possession.
 */
if (possession) {
  const previousTeamId =
    possession === 'home'
      ? match.home_team_id
      : match.away_team_id;

  if (previousTeamId) {
    const {
      error: endError,
    } = await supabase
      .from('match_events')
      .insert({
        match_id: match.id,
        period,
        game_clock:
          formatGameClock(
            periodClock
          ),
        team_id:
          previousTeamId,
        primary_player_cap:
          null,
        event_category:
          'POSSESSION_END',
      });

    if (endError) {
      console.error(
        'POSSESSION END ERROR:',
        endError
      );
    }
  }
}

/*
 * Record the beginning of the new possession.
 */
const {
  error: startError,
} = await supabase
  .from('match_events')
  .insert({
    match_id: match.id,
    period,
    game_clock:
      formatGameClock(
        periodClock
      ),
    team_id:
      nextTeamId,
    primary_player_cap:
      null,
    event_category:
      'POSSESSION_START',
  });

if (startError) {
  console.error(
    'POSSESSION START ERROR:',
    startError
  );

  return;
}

recordPossessionChange(
  nextTeam
);

setPossessionClock(30);

} catch (error) {
console.error(
'POSSESSION CHANGE ERROR:',
error
);
}
};

     

  /* =========================================================
     NEXT PERIOD
  ========================================================= */

  const handleNextPeriod = async () => {
    const nextPeriod = period < 4 ? period + 1 : 1;

    setPeriod(nextPeriod);
    setPeriodClock(gameDuration * 60);
    setShotClock(30);
    setPossessionClock(30);
    setIsRunning(false);
    setExclusions([]);
    setTimeouts([]);

    await updateMatchState({
      home_score: homeScore,
      away_score: awayScore,
      period: nextPeriod,
      period_clock_seconds: gameDuration * 60,
      shot_clock_seconds: 30,
      possession_clock_seconds: 30,
      is_running: false,
      home_cap_color: homeCapColor,
      away_cap_color: awayCapColor,
    });
  };

  const completeMatch = async () => {
    if (endingMatch || matchCompleted) {
      return;
    }

    const confirmed = window.confirm(
      `End match?\n\n` +
        `${match.home_team_name} ${homeScore}\n` +
        `${match.away_team_name} ${awayScore}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setEndingMatch(true);

      const url = `/api/scorekeeper/matches/${match.id}/complete`;

      console.log('COMPLETING MATCH:', {
        matchId: match.id,
        url,
        homeScore,
        awayScore,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeScore,
          awayScore,
        }),
      });

      console.log('COMPLETE MATCH RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      });

      const responseText = await response.text();

      console.log('COMPLETE MATCH RAW RESPONSE:', responseText);

      let result: any = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Could not parse API response as JSON:', parseError);

        throw new Error(`Server returned a non-JSON response (${response.status}).`);
      }

      if (!response.ok) {
        console.error('COMPLETE MATCH API ERROR:', result);

        alert(result.error || `Could not complete match (${response.status}).`);

        return;
      }

      console.log('MATCH COMPLETED:', result);

      setMatchCompleted(true);
      setIsRunning(false);
    } catch (error) {
      console.error('Complete match failed:', error);

      alert(error instanceof Error ? error.message : 'Could not complete the match.');
    } finally {
      setEndingMatch(false);
    }
  };

  /* =========================================================
     GAME DURATION
  ========================================================= */

  const handleDurationChange = (duration: GameDuration) => {
    setGameDuration(duration);

    if (!isRunning) {
      setPeriodClock(duration * 60);
    }
  };

  /* =========================================================
     EVENT LOGGING
  ========================================================= */
  const selectedCap = selectedTeam === 'home' ? homeSelectedCap : awaySelectedCap;

  const logEvent = async (
eventType: string
) => {
console.log(
'LOGGING EVENT:',
eventType
);

const isHome =
selectedTeam === 'home';

const activeTeamId =
isHome
? match.home_team_id
: match.away_team_id;

if (!activeTeamId) {
console.error(
'No active team ID available.'
);

return;

}

let newHomeScore =
homeScore;

let newAwayScore =
awayScore;

/*

* SCORING
  */

if (
eventType === 'GOAL' ||
eventType === 'PENALTY_GOAL'
) {
if (isHome) {
newHomeScore += 1;
} else {
newAwayScore += 1;
}

setHomeScore(
  newHomeScore
);

setAwayScore(
  newAwayScore
);

setShotClock(30);

const nextTeam =
  isHome
    ? 'away'
    : 'home';

recordPossessionChange(
  nextTeam
);

setPossessionClock(
  30
);

}

/*

* EXCLUSION
  */

if (
eventType ===
'EXCLUSION_COMMITTED'
) {
setExclusions(
(previous) => [
...previous,
{
id:
crypto.randomUUID(),
team:
selectedTeam,
cap:
selectedCap,
type:
'EXCLUSION_COMMITTED',
timeRemaining: 20,
},
]
);
}

/*

* ROLLING EXCLUSION
  */

if (
eventType ===
'ROLLING_EXCLUSION'
) {
setExclusions(
(previous) => [
...previous,
{
id:
crypto.randomUUID(),
team:
selectedTeam,
cap:
selectedCap,
type:
'ROLLING_EXCLUSION',
timeRemaining: 20,
},
]
);
}

/*

* CORNER THROW
  */

if (
eventType ===
'CORNER_THROW_20'
) {
setPossessionClock(
20
);

setShotClock(
  20
);

}

/*

* TIMEOUT
  */

if (
eventType ===
'TIMEOUT'
) {
setTimeouts(
(previous) => [
...previous,
{
id:
crypto.randomUUID(),
team:
selectedTeam,
timeRemaining: 60,
},
]
);
}

/*

* SPRINT EVENTS
*
* Sprint events reset possession to
* the team that won the sprint.
  */

if (
eventType ===
'SPRINT_WON'
) {
recordPossessionChange(
selectedTeam
);

setPossessionClock(
  30
);

setShotClock(
  30
);

}

if (
eventType ===
'SPRINT_LOST'
) {
const otherTeam =
selectedTeam ===
'home'
? 'away'
: 'home';

recordPossessionChange(
  otherTeam
);

setPossessionClock(
  30
);

setShotClock(
  30
);

}

/*

* DATABASE EVENT
*
* IMPORTANT:
* The database column is event_category,
* not event_type.
  */

const {
error,
} = await supabase
.from('match_events')
.insert([
{
match_id:
match.id,

    period,

    game_clock:
      formatGameClock(
        periodClock
      ),

    team_id:
      activeTeamId,

    primary_player_cap:
      eventType ===
      'TIMEOUT'
        ? null
        : Number(
            selectedCap
          ),

    event_category:
      eventType,
  },
]);

if (error) {
console.error(
'Error logging event:',
error
);

return;

}

/*

* MATCH STATE
  */

const {
error: matchError,
} =
await supabase
.from('matches')
.update({
home_score:
newHomeScore,

    away_score:
      newAwayScore,

    period,

    period_clock_seconds:
      periodClock,

    shot_clock_seconds:
      shotClock,

    is_running:
      isRunning,

    home_cap_color:
      homeCapColor,

    away_cap_color:
      awayCapColor,
  })
  .eq(
    'id',
    match.id
  );

if (matchError) {
console.error(
'Error updating match state:',
matchError
);
}
};


  /* =========================================================
     DELETE ACTION
  ========================================================= */

  const deleteRecentAction = async (actionId: string) => {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', actionId)
      .eq('match_id', match.id);

    if (error) {
      console.error('Error deleting event:', error);
      return;
    }

    setRecentActions((current) => current.filter((action) => action.id !== actionId));
  };

  /* =========================================================
     FORMAT CLOCK
  ========================================================= */

  const formatGameClock = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');

    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen w-full overflow-x-hidden] text-white flex flex-col">
      {/* HEADER */}

      <header className="shrink-0 mx-3 mt-3 lg:mx-4 bg-[#e4dbd4] border border-[#234723] rounded-xl px-3 lg:px-5 py-2 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <div className="relative w-9 h-9 lg:w-11 lg:h-11 rounded-xl overflow-hidden border border-[#E3A355]/30 shadow-lg shrink-0">
            <Image
              src="/logos/logo-icon.png"
              alt="Veldt Analytics logo"
              fill
              priority
              sizes="44px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-xs lg:text-sm tracking-wide text-black uppercase truncate">
              VELDT ANALYTICS POOLSIDE CONSOLE
            </h1>

            <p className="hidden sm:block text-[9px] lg:text-[10px] text-[#667F66]">
              Official Tournament Operations System • 2026
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[9px] text-[#667F66] bg-[#0F1710] px-3 py-1.5 rounded-lg border border-[#234723]">
          <span>
            <kbd className="bg-[#234723] text-white px-1.5 py-0.5 rounded">Space</kbd> Start/Stop
          </span>

          <span>
            <kbd className="bg-[#234723] text-white px-1.5 py-0.5 rounded">R</kbd> Reset Shot
          </span>

          <span>
            <kbd className="bg-[#234723] text-white px-1.5 py-0.5 rounded">P</kbd> Possession
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />

          <span className="hidden sm:block text-[9px] uppercase tracking-widest text-[#667F66]">
            {isRunning ? 'Clock Running' : 'Clock Stopped'}
          </span>
        </div>
      </header>

      {/* CONSOLE */}

      <main className="flex-1 w-full px-3 py-3 lg:px-4 lg:py-4">
        <div className="grid w-full min-w-0 grid-cols-12 gap-4">
          {/* =====================================================
    TOP MATCH CONTROL
===================================================== */}

          <div className="col-span-12 min-w-0">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* HOME + AWAY AREA */}
              <div className="lg:col-span-8 min-w-0 flex flex-col gap-4">
                {/* TEAM CARDS */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* HOME */}
                  <div className="min-w-0">
                    <TeamCard
                      team="home"
                      teamName={match.home_team_name}
                      score={homeScore}
                      capColor={homeCapColor}
                      selectedTeam={selectedTeam}
                      possession={possession}
                      onSelectTeam={setSelectedTeam}
                      onSetPossession={recordPossessionChange}
                      onCapColorChange={setHomeCapColor}
                    />
                  </div>

                  {/* AWAY */}
                  <div className="min-w-0">
                    <TeamCard
                      team="away"
                      teamName={match.away_team_name}
                      score={awayScore}
                      capColor={awayCapColor}
                      selectedTeam={selectedTeam}
                      possession={possession}
                      onSelectTeam={setSelectedTeam}
                      onSetPossession={recordPossessionChange}
                      onCapColorChange={setAwayCapColor}
                    />
                  </div>
                </div>

                {/* POSSESSION CONTROL */}

                <div className="w-full">
                  <WaterPoloPossessionControl
                    homeTeam={{
                      id: match.home_team_id,
                      name: match.home_team_name,
                    }}
                    awayTeam={{
                      id: match.away_team_id,
                      name: match.away_team_name,
                    }}
                    activeTeam={possession}
                    possessionClock={possessionClock}
                    isRunning={isRunning}
                    onTeamChange={(team) => {
                      changePossession(team === 'HOME' ? 'home' : 'away');
                    }}
                  />
                </div>
              </div>

              {/* GAME CLOCK */}

              <div className="lg:col-span-4 min-w-0">
                <GameClock
                  period={period}
                  periodClock={periodClock}
                  shotClock={shotClock}
                  isRunning={isRunning}
                  gameDuration={gameDuration}
                  onNextPeriod={handleNextPeriod}
                  onDurationChange={handleDurationChange}
                  onResetShotClock={() => {
                    setShotClock(30);
                    setPossessionClock(30);
                  }}
                  onToggleRunning={() => toggleRunning()}
                />
              </div>

              {!matchCompleted ? (
                <button
                  type="button"
                  onClick={completeMatch}
                  disabled={endingMatch}
                  className="mt-3 w-full rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-300 transition hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {endingMatch ? 'ENDING MATCH...' : 'END MATCH & SAVE RESULT'}
                </button>
              ) : (
                <div className="mt-3 w-full rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-emerald-300">
                  MATCH COMPLETED
                </div>
              )}
            </div>
          </div>

          {/* =====================================================
    PLAYER CAPS + EVENT TAGGER
===================================================== */}

          <div className="col-span-12 grid grid-cols-12 gap-4">
            {/* PLAYER CAPS — 2/12 */}

            <section className="col-span-12 min-w-0">
              <PlayerCapSelector
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}

                homeSelectedCap={homeSelectedCap}
                awaySelectedCap={awaySelectedCap}

                onSelectHomeCap={setHomeSelectedCap}
                onSelectAwayCap={setAwaySelectedCap}

                homeCapColor={homeCapColor}
                awayCapColor={awayCapColor}

                selectedTeam={selectedTeam}
                onSelectTeam={setSelectedTeam}
              />
            </section>

            {/* EVENT TAGGER — 10/12 */}

            <section className="col-span-12 lg:col-span-10 min-w-0 rounded-2xl border border-[#234723] bg-[#162217] p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#667F66] uppercase tracking-[0.2em]">
                    Water Polo Event Tagger
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-white">Tag Match Action</h2>

                  <p className="mt-1 text-xs text-[#667F66]">
                    Select the active player, then tap an event.
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-[#234723] bg-[#0F1710] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#667F66]">
                  {selectedTeam === 'home' ? match.home_team_name : match.away_team_name}
                  {' • '}
                  Cap #{selectedCap}
                </div>
              </div>

              <WaterPoloEventTagger
                onSelectEvent={(event) => {
                  console.log('EVENT CLICKED:', event);

                  logEvent(event.id).catch((error) => {
                    console.error('LOG EVENT FAILED:', error);
                  });
                }}
              />
            </section>
          </div>

          {/* MATCH STATUS */}

          <div className="col-span-12 lg:col-span-7 min-w-0">
            <MatchStatus
              exclusions={exclusions}
              timeouts={timeouts}
              homeTeamName={match.home_team_name}
              awayTeamName={match.away_team_name}
            />
          </div>

          {/* RECENT ACTIONS */}

          <div className="col-span-12 lg:col-span-5 min-w-0">
            <RecentActions
              actions={recentActions}
              getActionTeamName={getActionTeamName}
              onDelete={deleteRecentAction}
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}

      <footer className="shrink-0 mx-3 mb-3 lg:mx-4 text-center text-[8px] text-[#667F66] py-1 border-t border-[#234723]/40">
        Veldt Analytics Water Polo Platform • Dynamic Cap & Realtime Scoring Suite
      </footer>
    </div>
  );
}
