'use client';

type TeamSide = 'home' | 'away';
type CapColor = 'white' | 'blue' | 'dark';

interface TeamCardProps {
  team: TeamSide;
  teamName: string;
  score: number;
  capColor: CapColor;
  selectedTeam: TeamSide;
  possession: TeamSide;
  onSelectTeam: (team: TeamSide) => void;
  onSetPossession: (team: TeamSide) => void;
  onCapColorChange: (color: CapColor) => void;
}

function CapBadge({ color }: { color: CapColor }) {
  if (color === 'white') {
    return (
      <span className="h-3 w-3 shrink-0 rounded-full bg-white border border-slate-300" />
    );
  }

  if (color === 'blue') {
    return (
      <span className="h-3 w-3 shrink-0 rounded-full bg-blue-600 border border-blue-400" />
    );
  }

  return (
    <span className="h-3 w-3 shrink-0 rounded-full bg-slate-950 border border-slate-600" />
  );
}

export default function TeamCard({
  team,
  teamName,
  score,
  capColor,
  selectedTeam,
  possession,
  onSelectTeam,
  onSetPossession,
  onCapColorChange,
}: TeamCardProps) {
  const isSelected = selectedTeam === team;
  const hasPossession = possession === team;

  return (
    <div
      onClick={() => onSelectTeam(team)}
      className={`relative w-full rounded-xl border p-2.5 cursor-pointer transition ${
        isSelected
          ? 'border-[#E3A355] bg-[#162217]'
          : 'border-[#234723] bg-[#162217]/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <CapBadge color={capColor} />

          <span className="text-[8px] font-bold uppercase tracking-wider text-[#667F66]">
            {team}
          </span>
        </div>

        <select
          value={capColor}
          onChange={(event) => {
            event.stopPropagation();
            onCapColorChange(
              event.target.value as CapColor
            );
          }}
          onClick={(event) => event.stopPropagation()}
          className="rounded border border-[#234723] bg-[#0F1710] px-1.5 py-0.5 text-[8px] text-[#E3A355]"
        >
          <option value="white">White</option>
          <option value="blue">Blue</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <h2 className="mt-1 truncate text-sm font-bold text-white">
        {teamName}
      </h2>

      <div className="mt-0.5 text-4xl font-black leading-none text-[#E3A355]">
        {score}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelectTeam(team);
          onSetPossession(team);
        }}
        className={`mt-1.5 w-full rounded-md py-1 text-[8px] font-bold transition ${
          hasPossession
            ? 'border border-[#E3A355] bg-[#234723] text-white'
            : 'border border-[#234723] bg-[#0F1710] text-[#667F66]'
        }`}
      >
        {hasPossession ? 'POSSESSION' : 'ASSIGN'}
      </button>
    </div>
  );
}