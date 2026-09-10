'use client';

type TeamSide = 'home' | 'away';

type PlayerCapSelectorProps = {
  homeTeamName: string;
  awayTeamName: string;

  homeSelectedCap: number | string;
  awaySelectedCap: number | string;

  onSelectHomeCap: (cap: number | string) => void;
  onSelectAwayCap: (cap: number | string) => void;

  homeCapColor: 'white' | 'blue' | 'dark';
  awayCapColor: 'white' | 'blue' | 'dark';

  selectedTeam: TeamSide;
  onSelectTeam: (team: TeamSide) => void;
};

const caps: (number | string)[] = [
  ...Array.from({ length: 15 }, (_, index) => index + 1),
  '1B',
];

function getCapColor(
  color: 'white' | 'blue' | 'dark'
) {
  switch (color) {
    case 'white':
      return {
        background: '#ffffff',
        border: '#cbd5e1',
        text: '#000000',
      };

    case 'blue':
      return {
        background: '#2563eb',
        border: '#60a5fa',
        text: '#ffffff',
      };

    case 'dark':
      return {
        background: '#0f172a',
        border: '#475569',
        text: '#ffffff',
      };
  }
}

function CapRow({
  team,
  teamName,
  selectedCap,
  onSelectCap,
  capColor,
  active,
  onActivate,
}: {
  team: TeamSide;
  teamName: string;
  selectedCap: number | string;
  onSelectCap: (cap: number | string) => void;
  capColor: 'white' | 'blue' | 'dark';
  active: boolean;
  onActivate: () => void;
}) {
  const colors = getCapColor(capColor);

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        active
          ? 'border-[#E3A355] bg-[#1d301f] shadow-lg shadow-[#E3A355]/10'
          : 'border-[#234723] bg-[#0F1710]'
      }`}
      onClick={onActivate}
    >
      {/* TEAM HEADER */}

      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onActivate();
          }}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full border-2 shadow-sm"
            style={{
              backgroundColor:
                colors.background,
              borderColor:
                colors.border,
            }}
          />

          <div className="min-w-0">
            <div
              className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                active
                  ? 'text-[#E3A355]'
                  : 'text-[#667F66]'
              }`}
            >
              {team}
            </div>

            <div className="truncate text-sm font-bold text-white">
              {teamName}
            </div>
          </div>
        </button>

        <div
          className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
            active
              ? 'bg-[#E3A355] text-black'
              : 'bg-[#162217] text-[#667F66] border border-[#234723]'
          }`}
        >
          CAP #{selectedCap}
        </div>
      </div>

      {/* CAP NUMBERS */}

      <div className="grid grid-cols-8 gap-1.5 md:grid-cols-16">
        {caps.map((cap) => {
          const isSelected =
            selectedCap === cap;

          return (
            <button
              key={String(cap)}
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                onActivate();
                onSelectCap(cap);
              }}
              className={`h-8 rounded-md text-[10px] font-black transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#E3A355] text-black ring-2 ring-white shadow-md scale-105'
                  : 'border border-[#234723] bg-[#162217] text-white hover:border-[#E3A355] hover:bg-[#234723]'
              }`}
            >
              #{cap}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PlayerCapSelector({
  homeTeamName,
  awayTeamName,
  homeSelectedCap,
  awaySelectedCap,
  onSelectHomeCap,
  onSelectAwayCap,
  homeCapColor,
  awayCapColor,
  selectedTeam,
  onSelectTeam,
}: PlayerCapSelectorProps) {
  return (
    <section className="w-full space-y-2">
      {/* SECTION TITLE */}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E3A355]">
            Player Caps
          </p>

          <p className="mt-0.5 text-[9px] text-[#667F66]">
            Select the player who performed the event.
          </p>
        </div>

        <div className="rounded-lg border border-[#234723] bg-[#162217] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#667F66]">
          Active:{' '}
          <span className="text-white">
            {selectedTeam === 'home'
              ? homeTeamName
              : awayTeamName}
          </span>
        </div>
      </div>

      {/* HOME */}

      <CapRow
        team="home"
        teamName={homeTeamName}
        selectedCap={homeSelectedCap}
        onSelectCap={onSelectHomeCap}
        capColor={homeCapColor}
        active={selectedTeam === 'home'}
        onActivate={() =>
          onSelectTeam('home')
        }
      />

      {/* AWAY */}

      <CapRow
        team="away"
        teamName={awayTeamName}
        selectedCap={awaySelectedCap}
        onSelectCap={onSelectAwayCap}
        capColor={awayCapColor}
        active={selectedTeam === 'away'}
        onActivate={() =>
          onSelectTeam('away')
        }
      />
    </section>
  );
}