import { Id } from "@/convex/_generated/dataModel";

export type ApprovedEvent = {
  _id: Id<"events">;
  title: string;
  description: string;
  briefSummary?: string;
  pillar?: string;
  dateRaw?: string;
  dateStart?: string;
  dateEnd?: string;
  timeStart?: string;
  timeEnd?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  locationName?: string;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  isVirtual?: boolean;
  costRaw?: string;
  costType?: string;
  costMin?: number;
  costMax?: number;
  difficultyLevel?: string;
  tags?: string[];
  sourceUrl?: string;
  marketName: string;
  categoryName: string;
};

export type CalendarView = "month" | "week" | "day" | "list";

export type FilterState = {
  market: string;
  pillar: string;
  costType: string;
  difficulty: string;
  category: string;
  virtual: string;
};

export type DerivedFilterOptions = {
  pillars: string[];
  costTypes: string[];
  difficulties: string[];
  categories: string[];
  hasVirtual: boolean;
};
