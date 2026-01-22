export const EVENT_CATEGORIES = [
  "CATEGORIA_1",
  "CATEGORIA_2",
  "CATEGORIA_3",
  "CATEGORIA_4"
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
