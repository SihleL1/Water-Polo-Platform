'use client';

import {
WATER_POLO_CATEGORY_STYLES,
WATER_POLO_EVENT_GROUPS,
type WaterPoloEvent,
} from '@/lib/water-polo-events';

export function WaterPoloEventTagger({
onSelectEvent,
}: {
onSelectEvent: (
event: WaterPoloEvent
) => void;
}) {
return ( <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
{WATER_POLO_EVENT_GROUPS.map(
(group) => {
const style =
WATER_POLO_CATEGORY_STYLES[
group.category
];

      return (
        <section
          key={group.category}
          aria-label={group.title}
          className="min-w-0 rounded-lg border border-[#234723] bg-[#0F1710] p-2"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  style.accent,
              }}
            />

            <h3 className="text-[9px] font-black uppercase tracking-[0.15em] text-[#667F66]">
              {group.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {group.events.map(
              (event) => (
                <button
                  key={event.id}
                  type="button"
                  title={
                    event.description ??
                    event.label
                  }
                  onClick={() =>
                    onSelectEvent(
                      event
                    )
                  }
                  className="group relative flex min-h-11 items-center justify-center overflow-hidden rounded-md border border-transparent bg-[#0F1710] px-2 py-1.5 text-center transition-all duration-100 hover:border-[#E3A355] hover:bg-[#162217] active:scale-95"
                >
                  <span
                    className="absolute left-0 top-0 h-full w-0.5 opacity-70 transition-opacity group-hover:opacity-100"
                    style={{
                      backgroundColor:
                        style.accent,
                    }}
                  />

                  <span className="text-[10px] font-bold leading-tight text-white">
                    {event.label}
                  </span>
                </button>
              )
            )}
          </div>
        </section>
      );
    }
  )}
</div>

);
}
