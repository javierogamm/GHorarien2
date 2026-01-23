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

/**
 * Mapeo DIRECTO por valor real de Appwrite (eventType es STRING)
 * Valores reales detectados:
 * - "Taller"
 * - "Cena"
 * - "Comida"
 */
const EVENT_TYPE_BAND_CLASS: Record<string, string> = {
  Taller: "bg-sky-400",
  Cena: "bg-purple-400",
  Comida: "bg-emerald-400"
};

export const EventItem = ({ event, onSelect }: EventItemProps) => {
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
      className={`relative flex w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      {/* Banda de color según eventType */}
      <span
        className={`absolute left-2 top-1/2 h-3 w-1 -translate-y-1/2 rounded-full ${bandClass}`}
        aria-hidden="true"
      />

      <span className="truncate pl-2 text-left text-[11px] font-semibold text-slate-800">
        {event.nombre ? event.nombre : "Evento"}
      </span>
    </button>
  );
};
