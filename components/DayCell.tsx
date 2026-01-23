import type { CalendarEventDisplay } from "./calendarTypes";
import { EventItem } from "./EventItem";

type DayCellProps = {
  date: Date | null;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEventDisplay[];
  highlightCategory?: CalendarEventDisplay["eventType"] | null;
  onSelect: (date: Date) => void;
  onEventSelect: (event: CalendarEventDisplay) => void;
};

export const DayCell = ({
  date,
  isToday,
  isSelected,
  events,
  highlightCategory = null,
  onSelect,
  onEventSelect
}: DayCellProps) => {
  return (
    <div
      role={date ? "button" : undefined}
      tabIndex={date ? 0 : -1}
      aria-disabled={!date}
      onClick={() => (date ? onSelect(date) : null)}
      onKeyDown={(event) => {
        if (!date) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(date);
        }
      }}
      className={`flex min-h-[140px] flex-col gap-2 rounded-2xl border bg-white/70 p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        isToday ? "border-indigo-400/70 bg-indigo-50/60" : "border-slate-200/70"
      } ${isSelected ? "ring-2 ring-indigo-400/70" : ""} ${
        !date ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-semibold ${
            isToday ? "text-indigo-600" : "text-slate-700"
          }`}
        >
          {date ? date.getDate() : ""}
        </span>
        {isToday ? (
          <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Hoy
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {events.map((event) => {
          const isFiltered = Boolean(highlightCategory);
          const isHighlighted =
            isFiltered && event.eventType === highlightCategory;

          return (
            <EventItem
              key={event.groupKey}
              event={event}
              onSelect={onEventSelect}
              isDimmed={isFiltered && !isHighlighted}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </div>
    </div>
  );
};
