import type { CalendarEvent } from "../services/eventsService";

const categoryStyles: Record<CalendarEvent["eventType"], string> = {
  CATEGORIA_1: "bg-category-1/15 text-category-1 border-category-1/30",
  CATEGORIA_2: "bg-category-2/15 text-category-2 border-category-2/30",
  CATEGORIA_3: "bg-category-3/15 text-category-3 border-category-3/30",
  CATEGORIA_4: "bg-category-4/15 text-category-4 border-category-4/30"
};

const categoryLabel: Record<CalendarEvent["eventType"], string> = {
  CATEGORIA_1: "Categoria 1",
  CATEGORIA_2: "Categoria 2",
  CATEGORIA_3: "Categoria 3",
  CATEGORIA_4: "Categoria 4"
};

type EventItemProps = {
  event: CalendarEvent;
};

export const EventItem = ({ event }: EventItemProps) => {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${categoryStyles[event.eventType]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {categoryLabel[event.eventType]}
        </span>
        <span className="text-[10px] font-medium text-slate-500">
          {event.horaInicio.slice(11, 16)} - {event.horaFin.slice(11, 16)}
        </span>
      </div>
      {event.notas ? (
        <p className="text-[11px] leading-snug text-slate-700">
          {event.notas}
        </p>
      ) : null}
    </div>
  );
};
