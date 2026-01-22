import { EVENT_CATEGORIES } from "../constants/eventCategories";
import type { CalendarEvent } from "../services/eventsService";
import { DayCell } from "./DayCell";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

type CalendarProps = {
  currentMonth: number;
  currentYear: number;
  events: CalendarEvent[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onYearChange: (year: number) => void;
};

const buildCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startWeekDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }
    return new Date(year, month, dayNumber);
  });
};

const getEventsForDay = (events: CalendarEvent[], date: Date | null) => {
  if (!date) return [];
  const target = date.toISOString().split("T")[0];
  return events.filter((event) => event.horaInicio.startsWith(target));
};

export const Calendar = ({
  currentMonth,
  currentYear,
  events,
  onPrevMonth,
  onNextMonth,
  onYearChange
}: CalendarProps) => {
  const days = buildCalendarDays(currentYear, currentMonth);
  const today = new Date();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
              Calendario mensual
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevMonth}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
              type="button"
            >
              Mes anterior
            </button>
            <button
              onClick={onNextMonth}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
              type="button"
            >
              Mes siguiente
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-slate-500" htmlFor="year-select">
            Año
          </label>
          <select
            id="year-select"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none"
            value={currentYear}
            onChange={(event) => onYearChange(Number(event.target.value))}
          >
            {Array.from({ length: 7 }, (_, index) => currentYear - 3 + index).map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            )}
          </select>
          <div className="flex flex-wrap items-center gap-3">
            {EVENT_CATEGORIES.map((category) => (
              <span
                key={category}
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    category === "CATEGORIA_1"
                      ? "bg-category-1"
                      : category === "CATEGORIA_2"
                        ? "bg-category-2"
                        : category === "CATEGORIA_3"
                          ? "bg-category-3"
                          : "bg-category-4"
                  }`}
                />
                {category}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {weekDays.map((day) => (
          <div key={day} className="px-3">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((date, index) => {
          const isToday =
            date &&
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

          return (
            <DayCell
              key={`${currentYear}-${currentMonth}-${index}`}
              date={date}
              isToday={Boolean(isToday)}
              events={getEventsForDay(events, date)}
            />
          );
        })}
      </div>
    </section>
  );
};
