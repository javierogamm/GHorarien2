import { EVENT_CATEGORY_META } from "../constants/eventCategories";
import type { CalendarEventDisplay } from "./calendarTypes";

type EventItemProps = {
  event: CalendarEventDisplay;
};

export const EventItem = ({ event }: EventItemProps) => {
  const meta = EVENT_CATEGORY_META[event.eventType];
  const timeRange =
    event.horaInicio && event.horaFin
      ? `${event.horaInicio.slice(11, 16)}-${event.horaFin.slice(11, 16)}`
      : "";

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-2 py-1 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      <span className={`mt-0.5 h-2 w-2 rounded-full ${meta.dotClass}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11px] font-semibold text-slate-800">
          {event.nombre ? event.nombre : "Evento"}
        </span>
        <span className="truncate text-[10px] font-medium text-slate-500">
          {meta.label}
        </span>
      </div>
      {timeRange ? (
        <span className="text-[10px] font-medium text-slate-600">{timeRange}</span>
      ) : null}
      {event.attendeeCount > 1 ? (
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
          {event.attendeeCount} asistentes
        </span>
      ) : null}
    </div>
  );
};
