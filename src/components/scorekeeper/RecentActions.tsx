'use client';

import { Trash2 } from 'lucide-react';

export interface RecentAction {
  id: string;
  event_category: string;
  primary_player_cap: number | null;
  period: number;
  game_clock: string | null;
  team_id: string;
  created_at: string;
}

interface RecentActionsProps {
  actions: RecentAction[];
  getActionTeamName: (teamId: string) => string;
  onDelete: (actionId: string) => void;
}

function formatEventName(eventCategory: string) {
  return String(eventCategory)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function RecentActions({
  actions,
  getActionTeamName,
  onDelete,
}: RecentActionsProps) {
  return (
    <section className="w-full min-h-[220px] max-h-[300px] rounded-2xl border border-[#234723] bg-[#162217] p-3 lg:p-4 shadow-lg flex flex-col">
      <div className="shrink-0 flex items-center justify-between mb-2">
        <div>
          <p className="text-[9px] font-black text-[#E3A355] uppercase tracking-[0.25em]">
            Recent Actions
          </p>

          <p className="text-[9px] text-[#667F66] mt-0.5">
            Live match events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />

          <span className="text-[9px] uppercase tracking-widest text-[#667F66]">
            Live
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
        {actions.length === 0 ? (
          <div className="rounded-xl bg-[#0F1710] border border-[#234723] p-5 text-center">
            <p className="text-xs text-[#667F66]">
              No actions logged yet.
            </p>

            <p className="text-[10px] text-[#667F66] mt-1">
              Events will appear here as they are recorded.
            </p>
          </div>
        ) : (
          actions.map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-2 rounded-lg border border-[#234723] bg-[#0F1710] px-2.5 py-2"
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-[#E3A355]" />

              <div className="font-mono text-[9px] text-[#667F66] tabular-nums shrink-0">
                {action.game_clock ?? '--:--'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] lg:text-xs text-white truncate">
                  {formatEventName(action.event_category)}
                </div>

                <div className="text-[9px] text-[#667F66] mt-0.5 truncate">
                  {getActionTeamName(action.team_id)}

                  {action.primary_player_cap !== null && (
                    <>
                      {' • '}
                      Cap #{action.primary_player_cap}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <div className="rounded-md bg-[#162217] border border-[#234723] px-2 py-1 text-[8px] uppercase tracking-wider text-[#E3A355]">
                  Q{action.period}
                </div>

                <button
                  type="button"
                  onClick={() => onDelete(action.id)}
                  title="Remove action"
                  className="h-7 w-7 rounded-md border border-red-900/50 bg-red-950/30 text-red-400 flex items-center justify-center hover:bg-red-900/50 hover:text-red-300 active:scale-95 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}