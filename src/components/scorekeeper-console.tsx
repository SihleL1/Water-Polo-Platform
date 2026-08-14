'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  ShieldAlert,
  Award,
  ArrowLeftRight,
  RefreshCw,
  Layers,
  Shield,
  Flag,
} from 'lucide-react';

const logoColors = {
  primary: '#234723',
  accent: '#E3A355',
  dark: '#0F1710',
  sage: '#667F66',
  light: '#F5F5F4',
};

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
  };
}

interface Exclusion {
  id: string;
  team: 'home' | 'away';
  cap: number | string;
  timeRemaining: number;
}

export default function ScorekeeperConsole({ match }: MatchProps) {
  const [homeScore, setHomeScore] = useState<number>(match.home_score ?? 0);
  const [awayScore, setAwayScore] = useState<number>(match.away_score ?? 0);
  const [period, setPeriod] = useState<number>(match.period ?? 1);
  const [possession, setPossession] = useState<'home' | 'away'>('home');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedCap, setSelectedCap] = useState<number | string>(1);

  const [homeCapColor, setHomeCapColor] = useState<'white' | 'blue' | 'dark'>(
    match.home_cap_color || 'white'
  );
  const [awayCapColor, setAwayCapColor] = useState<'white' | 'blue' | 'dark'>(
    match.away_cap_color || 'blue'
  );

  const [periodClock, setPeriodClock] = useState<number>(480);
  const [shotClock, setShotClock] = useState<number>(30);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [exclusions, setExclusions] = useState<Exclusion[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setPeriodClock((prev) => (prev > 0 ? prev - 1 : 0));
        setShotClock((prev) => (prev > 0 ? prev - 1 : 0));

        setExclusions((prev) =>
          prev
            .map((ex) => ({ ...ex, timeRemaining: ex.timeRemaining - 1 }))
            .filter((ex) => ex.timeRemaining > 0)
        );
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const updateMatchState = useCallback(async (updates: Record<string, any>) => {
    await supabase.from('matches').update(updates).eq('id', match.id);
  }, [match.id]);

  const toggleRunning = useCallback(
    async (next?: boolean) => {
      const newRunning = typeof next === 'boolean' ? next : !isRunning;
      setIsRunning(newRunning);
      await updateMatchState({ is_running: newRunning });
    },
    [isRunning, updateMatchState]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleRunning();
      } else if (e.key.toLowerCase() === 'r') {
        setShotClock(30);
      } else if (e.key.toLowerCase() === 'p') {
        setPossession((p) => (p === 'home' ? 'away' : 'home'));
      }
    },
    [toggleRunning]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const logEvent = async (eventType: string) => {
    const isHome = selectedTeam === 'home';
    const activeTeamId = isHome ? match.home_team_id : match.away_team_id;

    let newHomeScore = homeScore;
    let newAwayScore = awayScore;

    if (eventType === 'GOAL') {
      if (isHome) newHomeScore += 1;
      else newAwayScore += 1;
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);
      setShotClock(30);
      setPossession(isHome ? 'away' : 'home');
    }

    if (eventType === 'EXCLUSION_COMMITTED') {
      setExclusions((prev) => [
        ...prev,
        { id: Math.random().toString(), team: selectedTeam, cap: selectedCap, timeRemaining: 20 },
      ]);
    }

    const minutes = Math.floor(periodClock / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (periodClock % 60).toString().padStart(2, '0');

    await supabase.from('match_events').insert([
      {
        match_id: match.id,
        period,
        game_clock: periodClock,
        team_id: activeTeamId,
        primary_player_cap: String(selectedCap),
        event_category: eventType,
      },
    ]);

    await updateMatchState({
      home_score: newHomeScore,
      away_score: newAwayScore,
      period,
      period_clock_seconds: periodClock,
      shot_clock_seconds: shotClock,
      is_running: isRunning,
      home_cap_color: homeCapColor,
      away_cap_color: awayCapColor,
    });
  };

  const renderCapBadge = (color: 'white' | 'blue' | 'dark') => {
    if (color === 'white') {
      return <span className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-sm" />;
    }
    if (color === 'blue') {
      return <span className="w-4 h-4 rounded-full bg-blue-600 border border-blue-400 shadow-sm" />;
    }
    return <span className="w-4 h-4 rounded-full bg-slate-950 border border-slate-600 shadow-sm" />;
  };

  return (
    <div className="min-h-screen bg-[#0F1710] text-white p-4 max-w-[1600px] mx-auto flex flex-col gap-4 font-sans select-none">
      <header className="bg-[rgba(15,23,16,0.95)] border border-[#234723] rounded-xl px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-3xl overflow-hidden border border-[#E3A355]/30 shadow-lg">
            <Image src="/logos/logo-icon.png" alt="Veldt Analytics logo" fill priority />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white uppercase">
              VELDT ANALYTICS POOLSIDE CONSOLE
            </h1>
            <p className="text-xs text-[#667F66]">
              Official Tournament Operations System • Est. 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#234723] bg-[#162217] px-4 py-3 shadow-inner shadow-black/20">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: logoColors.primary }} />
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: logoColors.accent }} />
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: logoColors.dark }} />
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: logoColors.sage }} />
          <span className="text-xs text-[#F5F5F4] uppercase tracking-wide">Using logo palette</span>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs text-[#667F66] bg-[#0F1710] px-3 py-1.5 rounded-lg border border-[#234723]">
          <span>
            <kbd className="bg-[#234723] text-white px-1.5 py-0.5 rounded text-[10px]">Space</kbd>{' '}
            Start/Stop Clock
          </span>
          <span>
            <kbd className="bg-[#234723] text-white px-1.5 py-0.5 rounded text-[10px]">R</kbd> Reset
            Shot Clock
          </span>
          <span>
            <kbd className="bg-[#234723] text-white px-1.5 py-0.5 rounded text-[10px]">P</kbd> Flip
            Possession
          </span>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div
          onClick={() => setSelectedTeam('home')}
          className={`col-span-12 md:col-span-4 p-5 rounded-2xl cursor-pointer border-2 transition relative overflow-hidden ${
            selectedTeam === 'home'
              ? 'border-[#E3A355] bg-[#162217] shadow-xl shadow-[#E3A355]/10'
              : 'border-[#234723] bg-[#162217]/60 opacity-80'
          }`}
        >
          {possession === 'home' && (
            <div className="absolute top-0 right-0 bg-[#E3A355] text-black font-extrabold text-[10px] px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
              <Flag size={12} /> In Possession
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {renderCapBadge(homeCapColor)}
              <span className="text-xs font-extrabold tracking-wider text-[#F5F5F4] uppercase">
                HOME ({homeCapColor.toUpperCase()})
              </span>
            </div>

            <select
              value={homeCapColor}
              onChange={(e) => setHomeCapColor(e.target.value as any)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0F1710] border border-[#234723] text-xs text-[#E3A355] rounded px-2 py-0.5 font-bold"
            >
              <option value="white">White Caps</option>
              <option value="blue">Blue Caps</option>
              <option value="dark">Dark Caps</option>
            </select>
          </div>

          <h2 className="text-2xl font-black text-white truncate">{match.home_team_name}</h2>
          <div className="text-7xl font-black text-[#E3A355] mt-1 tracking-tight">{homeScore}</div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setPossession('home');
            }}
            className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              possession === 'home'
                ? 'bg-[#234723] text-white border border-[#E3A355]'
                : 'bg-[#0F1710] text-[#667F66] hover:text-white border border-[#234723]'
            }`}
          >
            Assign Possession
          </button>
        </div>

        <div className="col-span-12 md:col-span-4 bg-[#162217] border border-[#234723] p-5 rounded-2xl flex flex-col items-center justify-between text-center shadow-xl">
          <div className="flex items-center justify-between w-full border-b border-[#234723] pb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[#E3A355]" />
              <span className="text-xs font-black text-[#E3A355] uppercase tracking-widest">
                QUARTER {period} / 4
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setPeriod((p) => (p < 4 ? p + 1 : 1));
                  setPeriodClock(480);
                  setShotClock(30);
                  setIsRunning(false);
                }}
                className="text-xs bg-[#0F1710] hover:bg-[#234723] border border-[#234723] px-2.5 py-1 rounded text-[#E3A355] font-bold"
              >
                + Next Quarter
              </button>
            </div>
          </div>

          <div className="my-2">
            <div className="text-6xl font-mono font-black text-red-500 tracking-wider">
              {Math.floor(periodClock / 60)
                .toString()
                .padStart(2, '0')}
              :{(periodClock % 60).toString().padStart(2, '0')}
            </div>
            <span className="text-[10px] text-[#667F66] uppercase font-bold tracking-widest">
              GAME CLOCK
            </span>
          </div>

          <div className="flex items-center gap-4 bg-[#0F1710] px-5 py-2 rounded-xl border border-[#234723] my-1">
            <div className="text-center">
              <span className="text-3xl font-mono font-black text-[#E3A355]">{shotClock}s</span>
              <span className="text-[9px] text-[#667F66] block font-bold uppercase">
                SHOT CLOCK
              </span>
            </div>

            <button
              onClick={() => setShotClock(30)}
              className="p-2.5 bg-[#234723] hover:bg-[#2e5c2e] text-[#E3A355] rounded-lg active:scale-95 transition border border-[#E3A355]/30"
              title="Reset Shot Clock to 30 (Key: R)"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mt-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition active:scale-95 ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-[#234723] hover:bg-[#2e5c2e] text-[#E3A355] border border-[#E3A355]/50'
              }`}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              {isRunning ? 'PAUSE CLOCK' : 'START CLOCK'}
            </button>

            <button
              onClick={() => setPossession((p) => (p === 'home' ? 'away' : 'home'))}
              className="py-3 bg-[#0F1710] hover:bg-[#1f2f20] border border-[#234723] text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <ArrowLeftRight size={16} className="text-[#E3A355]" />
              FLIP POSSESSION
            </button>
          </div>
        </div>

        <div
          onClick={() => setSelectedTeam('away')}
          className={`col-span-12 md:col-span-4 p-5 rounded-2xl cursor-pointer border-2 transition relative overflow-hidden ${
            selectedTeam === 'away'
              ? 'border-[#E3A355] bg-[#162217] shadow-xl shadow-[#E3A355]/10'
              : 'border-[#234723] bg-[#162217]/60 opacity-80'
          }`}
        >
          {possession === 'away' && (
            <div className="absolute top-0 right-0 bg-[#E3A355] text-black font-extrabold text-[10px] px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
              <Flag size={12} /> In Possession
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {renderCapBadge(awayCapColor)}
              <span className="text-xs font-extrabold tracking-wider text-[#F5F5F4] uppercase">
                AWAY ({awayCapColor.toUpperCase()})
              </span>
            </div>

            <select
              value={awayCapColor}
              onChange={(e) => setAwayCapColor(e.target.value as any)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0F1710] border border-[#234723] text-xs text-[#E3A355] rounded px-2 py-0.5 font-bold"
            >
              <option value="blue">Blue Caps</option>
              <option value="white">White Caps</option>
              <option value="dark">Dark Caps</option>
            </select>
          </div>

          <h2 className="text-2xl font-black text-white truncate">{match.away_team_name}</h2>
          <div className="text-7xl font-black text-[#E3A355] mt-1 tracking-tight">{awayScore}</div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setPossession('away');
            }}
            className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex flex items-center justify-center gap-2 ${
              possession === 'away'
                ? 'bg-[#234723] text-white border border-[#E3A355]'
                : 'bg-[#0F1710] text-[#667F66] hover:text-white border border-[#234723]'
            }`}
          >
            Assign Possession
          </button>
        </div>
      </div>

      <div className="bg-[#162217] p-5 rounded-2xl border border-[#234723] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-black text-[#E3A355] uppercase tracking-wider flex items-center gap-2">
            <Shield size={14} /> ACTIVE PLAYER CAP SELECTOR ({selectedTeam.toUpperCase()} TEAM)
          </label>
          <span className="text-xs text-[#667F66] font-semibold">
            Selected: <strong className="text-white font-mono font-bold">#{selectedCap}</strong>
          </span>
        </div>

        <div className="grid grid-cols-8 md:grid-cols-16 gap-2">
          {Array.from({ length: 15 }, (_, i) => i + 1).map((cap) => (
            <button
              key={cap}
              onClick={() => setSelectedCap(cap)}
              className={`h-14 rounded-xl font-black text-lg flex items-center justify-center transition active:scale-95 ${
                selectedCap === cap
                  ? 'bg-[#E3A355] text-black shadow-lg shadow-[#E3A355]/20 ring-2 ring-white scale-105'
                  : 'bg-[#0F1710] hover:bg-[#234723] text-white border border-[#234723]'
              }`}
            >
              #{cap}
            </button>
          ))}
          <button
            onClick={() => setSelectedCap('1B')}
            className={`h-14 rounded-xl font-bold text-sm flex items-center justify-center transition active:scale-95 ${
              selectedCap === '1B'
                ? 'bg-[#E3A355] text-black shadow-lg ring-2 ring-white scale-105'
                : 'bg-[#0F1710] hover:bg-[#234723] text-slate-300 border border-[#234723]'
            }`}
          >
            #1B
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => logEvent('GOAL')}
          className="p-6 bg-emerald-700 hover:bg-emerald-600 active:scale-95 rounded-2xl font-black text-xl text-white flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-950/40 border border-emerald-500/30"
        >
          <Plus size={32} />
          <span>GOAL SCORED</span>
        </button>

        <button
          onClick={() => logEvent('SHOT_ON_TARGET')}
          className="p-6 bg-[#234723] hover:bg-[#2e5c2e] active:scale-95 rounded-2xl font-bold text-lg text-white flex flex-col items-center justify-center gap-2 border border-[#E3A355]/40 shadow-xl"
        >
          <Award size={28} className="text-[#E3A355]" />
          <span>SHOT ON TARGET</span>
        </button>

        <button
          onClick={() => logEvent('EXCLUSION_COMMITTED')}
          className="p-6 bg-red-700 hover:bg-red-600 active:scale-95 rounded-2xl font-bold text-lg text-white flex flex-col items-center justify-center gap-2 shadow-xl shadow-red-950/40 border border-red-500/30"
        >
          <ShieldAlert size={28} />
          <span>20s EXCLUSION</span>
        </button>

        <button
          onClick={() => logEvent('GOALKEEPER_SAVE')}
          className="p-6 bg-[#0F1710] hover:bg-[#1a291b] active:scale-95 rounded-2xl font-bold text-lg text-[#E3A355] flex flex-col items-center justify-center gap-2 border border-[#234723] shadow-xl"
        >
          <RefreshCw size={28} />
          <span>GK SAVE / STEAL</span>
        </button>
      </div>

      {exclusions.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/50 p-4 rounded-2xl shadow-lg">
          <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldAlert size={16} /> ACTIVE 20-SECOND EXCLUSION TIMERS
          </h4>
          <div className="flex flex-wrap gap-3">
            {exclusions.map((ex) => (
              <div
                key={ex.id}
                className="bg-[#162217] px-5 py-2.5 rounded-xl border border-red-500/40 flex items-center gap-4 shadow-md"
              >
                <div>
                  <span className="text-xs text-[#667F66] font-bold block uppercase">
                    {ex.team} TEAM
                  </span>
                  <span className="text-base font-black text-white">CAP #{ex.cap}</span>
                </div>
                <div className="text-2xl font-mono font-black text-red-500 bg-[#0F1710] px-3 py-1 rounded-lg border border-red-900/50">
                  {ex.timeRemaining}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-2 text-center text-xs text-[#667F66] py-2 border-t border-[#234723]/40">
        Veldt Analytics Water Polo Platform • Dynamic Cap & Realtime Scoring Suite
      </footer>
    </div>
  );
}
