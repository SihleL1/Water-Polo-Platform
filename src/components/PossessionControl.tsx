'use client';

type TeamSide = 'HOME' | 'AWAY';

type Team = {
  id: string;
  name: string;
};

interface PossessionControlProps {
  homeTeam: Team;
  awayTeam: Team;
  activeTeam: 'home' | 'away';
  possessionClock: number;
  isRunning: boolean;
  onTeamChange: (team: TeamSide) => void;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');

  const remainingSeconds = (seconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
}

export function WaterPoloPossessionControl({
  homeTeam,
  awayTeam,
  activeTeam,
  possessionClock,
  isRunning,
  onTeamChange,
}: PossessionControlProps) {
  return (
    <section className="w-full rounded-xl border border-[#234723] bg-[#162217] px-2.5 py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

        <button
          type="button"
          onClick={() => onTeamChange('HOME')}
          className={`min-w-0 rounded-lg border px-2 py-1.5 text-left ${
            activeTeam === 'home'
              ? 'border-[#E3A355] bg-[#234723]'
              : 'border-[#234723] bg-[#0F1710]'
          }`}
        >
          <div className="truncate text-[8px] uppercase tracking-widest text-[#667F66]">
            HOME
          </div>

          <div className="truncate text-[10px] font-bold text-white">
            {homeTeam.name}
          </div>
        </button>

        <div className="flex flex-col items-center px-2">
          <span className="text-[7px] uppercase tracking-widest text-[#667F66]">
            Possession
          </span>

          <span
            className={`font-mono text-xl font-black tabular-nums ${
              possessionClock <= 5
                ? 'text-red-500'
                : 'text-[#E3A355]'
            }`}
          >
            {formatClock(possessionClock)}
          </span>

          <span
            className={`text-[7px] uppercase tracking-widest ${
              isRunning
                ? 'text-emerald-400'
                : 'text-[#667F66]'
            }`}
          >
            {isRunning ? 'LIVE' : 'PAUSED'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onTeamChange('AWAY')}
          className={`min-w-0 rounded-lg border px-2 py-1.5 text-right ${
            activeTeam === 'away'
              ? 'border-[#E3A355] bg-[#234723]'
              : 'border-[#234723] bg-[#0F1710]'
          }`}
        >
          <div className="truncate text-[8px] uppercase tracking-widest text-[#667F66]">
            AWAY
          </div>

          <div className="truncate text-[10px] font-bold text-white">
            {awayTeam.name}
          </div>
        </button>

      </div>
    </section>
  );
}