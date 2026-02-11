export const EVENT_CATEGORIES = ["Comida", "Cena", "Taller", "Visita cultural"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

type EventCategoryMeta = {
  label: string;
  dotClass: string;
  cardClass: string;
  startTime: string;
};

export const EVENT_CATEGORY_META: Record<EventCategory, EventCategoryMeta> = {
  Comida: {
    label: "Comida",
    dotClass: "bg-category-1",
    cardClass: "bg-category-1/15 text-category-1 border-category-1/30",
    startTime: "15:00"
  },
  Cena: {
    label: "Cena",
    dotClass: "bg-category-2",
    cardClass: "bg-category-2/15 text-category-2 border-category-2/30",
    startTime: "21:00"
  },
  Taller: {
    label: "Taller",
    dotClass: "bg-category-3",
    cardClass: "bg-category-3/15 text-category-3 border-category-3/30",
    startTime: "16:00"
  },
  "Visita cultural": {
    label: "Visita cultural",
    dotClass: "bg-category-4",
    cardClass: "bg-category-4/15 text-category-4 border-category-4/30",
    startTime: "10:00"
  }
};
