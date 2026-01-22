import type { CalendarEvent } from "../services/eventsService";
import { EventItem } from "./EventItem";

type DayCellProps = {
  date: Date | null;
  isToday: boolean;
  events: CalendarEvent[];
};

export const DayCell = ({ date, isToday, events }: DayCellProps) => {
  return (
    <div
      className={`flex min-h-[140px] flex-col gap-2 rounded-2xl border bg-white/70 p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        isToday ? "border-indigo-400/70 bg-indigo-50/60" : "border-slate-200/70"
      } ${!date ? "opacity-40" : ""}`}
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
        {events.map((event) => (
          <EventItem key={event.$id} event={event} />
        ))}
      </div>
    </div>
  );
};
