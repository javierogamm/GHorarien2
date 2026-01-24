import { EVENT_CATEGORY_META } from "../constants/eventCategories";
import type { CalendarEventDisplay } from "./calendarTypes";

type EventItemProps = {
  event: CalendarEventDisplay;
  onSelect: (event: CalendarEventDisplay) => void;
  isDimmed?: boolean;
  isHighlighted?: boolean;
};

const fallbackMeta = {
  label: "Evento",
  dotClass: "bg-slate-300",
  cardClass: "bg-slate-100 text-slate-600 border-slate-200"
};

/**
 * Mapeo DIRECTO por valor real de Appwrite (eventType es STRING)
 * Valores reales detectados:
 * - "Taller"
 * - "Cena"
 * - "Comida"
 */
const EVENT_TYPE_BAND_CLASS: Record<string, string> = {
  Taller: "bg-category-3",
  Cena: "bg-category-2",
  Comida: "bg-category-1",
  "Visita cultural": "bg-category-4"
};

export const EventItem = ({
  event,
  onSelect,
  isDimmed = false,
  isHighlighted = false
}: EventItemProps) => {
  const meta = EVENT_CATEGORY_META[event.eventType] ?? fallbackMeta;

  // eventType VIENE COMO STRING desde Appwrite
  const bandClass =
    EVENT_TYPE_BAND_CLASS[event.eventType] ?? fallbackMeta.dotClass;

  return (
    <button
      type="button"
      onClick={(eventClick) => {
        eventClick.stopPropagation();
        onSelect(event);
      }}
      className={`relative flex w-full flex-col items-start gap-1.5 rounded-xl border px-3 py-2 pl-5 pr-12 text-left text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass} ${
        isDimmed ? "opacity-35" : ""
      } ${isHighlighted ? "ring-2 ring-white/70" : ""}`}
    >
      {/* Banda de color según eventType */}
      <span
        className={`absolute inset-y-0 left-0 w-1.5 rounded-l-xl ${bandClass}`}
        aria-hidden="true"
      />

      <span className="block min-w-0 w-full pl-2 text-slate-800">
        <span className="block max-w-[calc(100%-3rem)] truncate">
          {event.nombre ? event.nombre : "Evento"}
        </span>
      </span>
      <span className="pointer-events-none absolute bottom-1.5 right-2 text-lg font-bold leading-none text-slate-800">
        {event.attendeeCount}
      </span>
    </button>
  );
};
