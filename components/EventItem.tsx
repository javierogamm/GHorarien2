import { EVENT_CATEGORY_META } from "../constants/eventCategories";
import type { CalendarEvent } from "../services/eventsService";

type EventItemProps = {
  event: CalendarEvent;
};

export const EventItem = ({ event }: EventItemProps) => {
  const meta = EVENT_CATEGORY_META[event.eventType];

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
      <span className="flex-1 truncate">
        {event.nombre ? event.nombre : meta.label}
      </span>
      <span className="text-[10px] font-medium text-slate-600">
        {event.horaInicio.slice(11, 16)}-{event.horaFin.slice(11, 16)}
      </span>
    </div>
  );
};
