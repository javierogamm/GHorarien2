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
      className={`relative flex w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      <span
        className={`absolute left-2 top-1/2 h-3 w-1 -translate-y-1/2 rounded-full ${meta.dotClass}`}
        aria-hidden="true"
      />
      <span className="truncate pl-2 text-left text-[11px] font-semibold text-slate-800">
        {event.nombre ? event.nombre : "Evento"} ({event.attendeeCount})
      </span>
    </button>
  );
};
