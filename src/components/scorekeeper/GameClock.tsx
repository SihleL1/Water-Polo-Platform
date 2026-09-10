'use client';

import {
  Layers,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

export type GameDuration = 5 | 6 | 8;

interface GameClockProps {
  period: number;
  periodClock: number;
  shotClock: number;
  isRunning: boolean;
  gameDuration: GameDuration;
  onNextPeriod: () => void;
  onDurationChange: (duration: GameDuration) => void;
  onResetShotClock: () => void;
  onToggleRunning: () => void;
}

export default function GameClock({
  period,
  periodClock,
  shotClock,
  isRunning,
  gameDuration,
  onNextPeriod,
  onDurationChange,
  onResetShotClock,
  onToggleRunning,
}: GameClockProps) {
  const minutes = Math.floor(periodClock / 60)
    .toString()
    .padStart(2, '0');

  const seconds = (periodClock % 60)
    .toString()
    .padStart(2, '0');

  return (
    <section className="w-full rounded-xl border border-[#234723] bg-[#e4dbd4] p-2 shadow-lg">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#234723] pb-1.5">
        <div className="flex items-center gap-1.5">
          <Layers size={11} className="text-[#E3A355]" />

          <span className="text-[8px] font-black uppercase tracking-wider text-black">
            Q{period} / 4
          </span>
        </div>

        <button
          type="button"
          onClick={onNextPeriod}
          className="rounded-md border border-[#234723] bg-[#0F1710] px-1.5 py-0.5 text-[8px] font-bold text-[#E3A355] hover:bg-[#234723]"
        >
          NEXT Q
        </button>
      </div>

      {/* CLOCK */}
      <div className="flex flex-col items-center">
        <div
          className={`mt-2 font-mono text-4xl lg:text-5xl font-black leading-none tracking-tight tabular-nums ${
            isRunning ? 'text-black' : 'text-black/70'
          }`}
        >
          {minutes}:{seconds}
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isRunning
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-500'
            }`}
          />

          <span className="text-[7px] font-black uppercase tracking-wider text-[#667F66]">
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
      </div>

      {/* DURATION */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {[5, 6, 8].map((duration) => (
          <button
            key={duration}
            type="button"
            disabled={isRunning}
            onClick={() =>
              onDurationChange(duration as GameDuration)
            }
            className={`rounded-md px-2 py-1 text-[8px] font-black transition ${
              gameDuration === duration
                ? 'bg-[#E3A355] text-black'
                : 'border border-[#234723] bg-[#0F1710] text-white'
            } ${
              isRunning
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-[#234723]'
            }`}
          >
            {duration}:00
          </button>
        ))}
      </div>

      {/* SHOT CLOCK */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="rounded-lg border border-[#234723] bg-[#0F1710] px-3 py-1.5 text-center">
          <div
            className={`font-mono text-lg font-black leading-none ${
              shotClock <= 10
                ? 'text-red-400'
                : 'text-[#E3A355]'
            }`}
          >
            {shotClock}s
          </div>

          <div className="mt-0.5 text-[6px] font-bold uppercase tracking-widest text-[#667F66]">
            SHOT CLOCK
          </div>
        </div>

        <button
          type="button"
          onClick={onResetShotClock}
          className="h-8 w-8 rounded-lg border border-[#E3A355]/30 bg-[#234723] flex items-center justify-center text-[#E3A355] hover:bg-[#2e5c2e] active:scale-95"
          title="Reset Shot Clock"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* START / STOP */}
      <button
        type="button"
        onClick={onToggleRunning}
        className={`mt-2 w-full rounded-lg py-2 text-[9px] font-black flex items-center justify-center gap-1.5 transition active:scale-95 ${
          isRunning
            ? 'bg-red-600 hover:bg-red-500 text-white'
            : 'bg-[#234723] hover:bg-[#2e5c2e] text-[#E3A355] border border-[#E3A355]/50'
        }`}
      >
        {isRunning ? (
          <>
            <Pause size={13} />
            PAUSE CLOCK
          </>
        ) : (
          <>
            <Play size={13} />
            START CLOCK
          </>
        )}
      </button>
    </section>
  );
}