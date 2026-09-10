'use client';

import { Shield, ShieldAlert } from 'lucide-react';

export interface Exclusion {
  id: string;
  team: 'home' | 'away';
  cap: number | string;
  type: 'EXCLUSION_COMMITTED' | 'ROLLING_EXCLUSION';
  timeRemaining: number;
}

export interface TeamTimeout {
  id: string;
  team: 'home' | 'away';
  timeRemaining: number;
}

interface MatchStatusProps {
  exclusions: Exclusion[];
  timeouts: TeamTimeout[];
  homeTeamName: string;
  awayTeamName: string;
}

export default function MatchStatus({
  exclusions,
  timeouts,
  homeTeamName,
  awayTeamName,
}: MatchStatusProps) {
  const getTeamName = (team: 'home' | 'away') =>
    team === 'home' ? homeTeamName : awayTeamName;

  return (
    <section className="grid grid-cols-1 gap-3">
      {/* EXCLUSIONS */}
      <div>
        {exclusions.length > 0 ? (
          <div className="bg-red-950/30 border border-red-800/50 px-3 py-2 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <h4 className="text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
                <ShieldAlert size={13} />
                ACTIVE EXCLUSIONS
              </h4>

              <div className="flex flex-wrap gap-2">
                {exclusions.map((exclusion) => (
                  <div
                    key={exclusion.id}
                    className="bg-[#162217] px-3 py-1 rounded-lg border border-red-500/40 flex items-center gap-3"
                  >
                    <span className="text-[9px] text-[#667F66] uppercase font-bold">
                      {getTeamName(exclusion.team)}
                    </span>

                    <span className="text-[10px] font-black text-white">
                      #{exclusion.cap}
                    </span>

                    <span className="text-[9px] uppercase text-red-300">
                      {exclusion.type === 'ROLLING_EXCLUSION'
                        ? 'ROLLING'
                        : '20S'}
                    </span>

                    <span className="text-sm font-mono font-black text-red-500">
                      {exclusion.timeRemaining}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-8 rounded-xl border border-[#234723] bg-[#162217]/60 flex items-center px-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#667F66]">
              No active exclusions
            </span>
          </div>
        )}
      </div>

      {/* TIMEOUTS */}
      <div>
        {timeouts.length > 0 ? (
          <div className="bg-blue-950/30 border border-blue-800/50 px-3 py-2 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
                <Shield size={13} />
                ACTIVE TIMEOUTS
              </h4>

              <div className="flex flex-wrap gap-2">
                {timeouts.map((timeout) => (
                  <div
                    key={timeout.id}
                    className="bg-[#162217] px-3 py-1 rounded-lg border border-blue-500/40 flex items-center gap-3"
                  >
                    <span className="text-[9px] text-[#667F66] uppercase font-bold">
                      {getTeamName(timeout.team)}
                    </span>

                    <span className="text-sm font-mono font-black text-blue-400">
                      {Math.floor(timeout.timeRemaining / 60)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {(timeout.timeRemaining % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-8 rounded-xl border border-[#234723] bg-[#162217]/60 flex items-center px-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#667F66]">
              No active timeouts
            </span>
          </div>
        )}
      </div>
    </section>
  );
}