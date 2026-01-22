import type { CalendarEvent } from "../services/eventsService";

export type CalendarEventDisplay = CalendarEvent & {
  attendeeCount: number;
  attendees: string[];
  groupKey: string;
};
