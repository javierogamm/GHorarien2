import type { CalendarEventDisplay } from "./calendarTypes";
import { EventItem } from "./EventItem";

type DayCellProps = {
  date: Date | null;
  isToday: boolean;
  isPastDay: boolean;
  isSelected: boolean;
  events: CalendarEventDisplay[];
  highlightCategory?: CalendarEventDisplay["eventType"] | null;
  dimUnassignedEvents?: boolean;
  highlightUsername?: string | null;
  allowAddEvent?: boolean;
  onSelect: (date: Date, events: CalendarEventDisplay[]) => void;
  onAddEvent: (date: Date) => void;
  onEventSelect: (event: CalendarEventDisplay) => void;
};

export const DayCell = ({
  date,
  isToday,
  isPastDay,
  isSelected,
  events,
  highlightCategory = null,
  dimUnassignedEvents = false,
  highlightUsername = null,
  allowAddEvent = true,
  onSelect,
  onAddEvent,
  onEventSelect
}: DayCellProps) => {
  return (
    <div
      role={date ? "button" : undefined}
      tabIndex={date ? 0 : -1}
      aria-disabled={!date}
      onClick={() => (date ? onSelect(date, events) : null)}
      onKeyDown={(event) => {
        if (!date) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(date, events);
        }
      }}
      className={`flex min-h-[140px] flex-col gap-2 rounded-2xl border bg-white/70 p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        isToday ? "border-indigo-400/70 bg-indigo-50/60" : "border-slate-200/70"
      } ${!isToday && isPastDay ? "border-slate-300/70 bg-slate-100/70" : ""} ${
        !isToday && !isPastDay ? "bg-white/70" : ""
      } ${isSelected ? "ring-2 ring-indigo-400/70" : ""} ${
        !date ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-semibold ${
            isToday ? "text-indigo-600" : "text-slate-700"
          }`}
        >
          {date ? date.getDate() : ""}
        </span>
        <div className="flex items-center gap-2">
          {isToday ? (
            <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Hoy
            </span>
          ) : null}
          {date && allowAddEvent ? (
            <button
              type="button"
              aria-label="Crear evento"
              onClick={(event) => {
                event.stopPropagation();
                onAddEvent(date);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
            >
              +
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {events.map((event) => {
          const isFiltered = Boolean(highlightCategory);
          const isHighlighted =
            isFiltered && event.eventType === highlightCategory;
          const isAssignedToUser = Boolean(
            highlightUsername && event.attendees.includes(highlightUsername)
          );
          const shouldDimByAssignment =
            dimUnassignedEvents && Boolean(highlightUsername) && !isAssignedToUser;

          return (
            <EventItem
              key={event.groupKey}
              event={event}
              onSelect={onEventSelect}
              isDimmed={(isFiltered && !isHighlighted) || shouldDimByAssignment}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </div>
    </div>
  );
};
