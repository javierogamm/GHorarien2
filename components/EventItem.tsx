import { EVENT_CATEGORY_META } from "../constants/eventCategories";
import type { CalendarEventDisplay } from "./calendarTypes";

type EventItemProps = {
  event: CalendarEventDisplay;
  onSelect: (event: CalendarEventDisplay) => void;
};

const fallbackMeta = {
  label: "Evento",
  dotClass: "bg-slate-300",
  cardClass: "bg-slate-100 text-slate-600 border-slate-200"
};

export const EventItem = ({ event, onSelect }: EventItemProps) => {
  const meta = EVENT_CATEGORY_META[event.eventType] ?? fallbackMeta;

  return (
    <button
      type="button"
      onClick={(eventClick) => {
        eventClick.stopPropagation();
        onSelect(event);
      }}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      <span className="truncate text-left text-[11px] font-semibold text-slate-800">
        {event.nombre ? event.nombre : "Evento"} ({event.attendeeCount})
      </span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
        {meta.label}
      </span>
    </button>
  );
};
