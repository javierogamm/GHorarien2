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
      className={`relative flex w-full items-center gap-2 rounded-xl border px-3 py-1.5 pl-5 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass} ${
        isDimmed ? "opacity-35" : ""
      } ${isHighlighted ? "ring-2 ring-white/70" : ""}`}
    >
      {/* Banda de color según eventType */}
      <span
        className={`absolute inset-y-0 left-0 w-1.5 rounded-l-xl ${bandClass}`}
        aria-hidden="true"
      />

      <span className="truncate pl-2 text-left text-[11px] font-semibold text-slate-800">
        {event.nombre ? event.nombre : "Evento"} ({event.attendeeCount})
      </span>
    </button>
  );
};
