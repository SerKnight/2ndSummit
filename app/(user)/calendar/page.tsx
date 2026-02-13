"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  DollarSign,
  Activity,
  Tag,
  ExternalLink,
  CalendarDays,
  Repeat,
  Globe,
} from "lucide-react";

type ApprovedEvent = {
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

const PILLAR_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; badge: string }
> = {
  Move: {
    bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  Discover: {
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-300",
  },
  Connect: {
    bg: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    text: "text-purple-800",
    dot: "bg-purple-500",
    badge: "bg-purple-100 text-purple-700 border-purple-300",
  },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function parseEventDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

function getEventDate(event: ApprovedEvent): string | undefined {
  return event.dateStart || event.dateRaw;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Date TBD";
  const d = parseEventDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCost(event: ApprovedEvent): string | null {
  if (event.costType === "free") return "Free";
  if (event.costRaw) return event.costRaw;
  if (event.costMin != null && event.costMax != null) {
    if (event.costMin === event.costMax) return `$${event.costMin}`;
    return `$${event.costMin} - $${event.costMax}`;
  }
  if (event.costMin != null) return `From $${event.costMin}`;
  return null;
}

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedPillar, setSelectedPillar] = useState<string>("all");
  const [selectedMarket, setSelectedMarket] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<ApprovedEvent | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const events = useQuery(api.events.listApproved, {
    pillar: selectedPillar === "all" ? undefined : selectedPillar,
    marketId: selectedMarket === "all" ? undefined : selectedMarket as Id<"markets">,
  });

  const markets = useQuery(api.events.listActiveMarkets);

  const eventsByDate = useMemo(() => {
    if (!events) return {};
    const map: Record<string, ApprovedEvent[]> = {};
    for (const event of events) {
      const dateStr = getEventDate(event);
      if (!dateStr) continue;
      const d = parseEventDate(dateStr);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => {
      const da = parseEventDate(getEventDate(a));
      const db = parseEventDate(getEventDate(b));
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return sortedEvents.filter((e) => {
      const d = parseEventDate(getEventDate(e));
      return d && d >= now;
    });
  }, [sortedEvents]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Curated Experiences
          </h1>
          <p className="mt-1 text-gray-500">
            Thoughtfully designed gatherings to help you stay active, curious, and connected.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setView("calendar")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  view === "calendar"
                    ? "bg-[#2d4f50] text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <CalendarDays className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                Calendar
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  view === "list"
                    ? "bg-[#2d4f50] text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Upcoming
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedPillar} onValueChange={setSelectedPillar}>
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue placeholder="All Pillars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                <SelectItem value="Move">Move</SelectItem>
                <SelectItem value="Discover">Discover</SelectItem>
                <SelectItem value="Connect">Connect</SelectItem>
              </SelectContent>
            </Select>

            {markets && markets.length > 1 && (
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="All Markets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {markets.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Calendar View */}
        {view === "calendar" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-sm font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateKey = day
                  ? `${currentYear}-${currentMonth}-${day}`
                  : null;
                const dayEvents = dateKey ? eventsByDate[dateKey] || [] : [];

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[100px] sm:min-h-[120px] border-b border-r p-1.5 sm:p-2",
                      !day && "bg-gray-50",
                      idx % 7 === 0 && "border-l-0",
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                            isToday(day)
                              ? "bg-[#2d4f50] text-white font-bold"
                              : "text-gray-700"
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 3).map((event) => {
                            const style =
                              PILLAR_STYLES[event.pillar ?? ""] ?? PILLAR_STYLES.Discover;
                            return (
                              <button
                                key={event._id}
                                onClick={() => setSelectedEvent(event)}
                                className={cn(
                                  "w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate border transition-colors cursor-pointer",
                                  style.bg,
                                  style.text
                                )}
                                title={event.title}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-1.5 w-1.5 rounded-full mr-1 -mt-0.5",
                                    style.dot
                                  )}
                                />
                                {event.title}
                              </button>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <p className="text-xs text-gray-500 pl-1">
                              +{dayEvents.length - 3} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <div className="space-y-3">
            {!events ? (
              <div className="text-center py-12 text-gray-500">
                Loading curated experiences...
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-800 text-lg">Nothing on the horizon just yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Check back soon -- new experiences are always in the works
                </p>
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const style =
                  PILLAR_STYLES[event.pillar ?? ""] ?? PILLAR_STYLES.Discover;
                const cost = formatCost(event);
                return (
                  <button
                    key={event._id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left rounded-xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0 sm:w-16 sm:min-w-16 shrink-0">
                        {(() => {
                          const d = parseEventDate(getEventDate(event));
                          if (!d) return <span className="text-sm text-gray-400">TBD</span>;
                          return (
                            <>
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                {d.toLocaleDateString("en-US", { month: "short" })}
                              </span>
                              <span className="text-2xl font-bold text-gray-900 leading-none">
                                {d.getDate()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {d.toLocaleDateString("en-US", { weekday: "short" })}
                              </span>
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {event.title}
                          </h3>
                          <Badge className={cn("shrink-0", style.badge)}>
                            {event.pillar}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {event.briefSummary || event.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                          {event.timeStart && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.timeStart}
                              {event.timeEnd && ` - ${event.timeEnd}`}
                            </span>
                          )}
                          {event.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.locationName}
                              {event.locationCity && `, ${event.locationCity}`}
                            </span>
                          )}
                          {event.isVirtual && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Virtual
                            </span>
                          )}
                          {cost && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {cost}
                            </span>
                          )}
                          {event.difficultyLevel && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {event.difficultyLevel}
                            </span>
                          )}
                          {event.isRecurring && (
                            <span className="flex items-center gap-1">
                              <Repeat className="h-3 w-3" />
                              Recurring
                            </span>
                          )}
                          <span className="text-gray-400">
                            {event.categoryName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {events && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {events.length} curated experience{events.length !== 1 ? "s" : ""}
            {selectedPillar !== "all" && ` in ${selectedPillar}`}
          </p>
        )}
      </div>

      {/* Event Detail Sheet */}
      <Sheet
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedEvent && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  {selectedEvent.pillar && (
                    <Badge
                      className={
                        PILLAR_STYLES[selectedEvent.pillar]?.badge ??
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {selectedEvent.pillar}
                    </Badge>
                  )}
                  <Badge variant="outline">{selectedEvent.categoryName}</Badge>
                  {selectedEvent.isRecurring && (
                    <Badge variant="outline" className="text-xs">
                      <Repeat className="mr-1 h-3 w-3" />
                      Recurring
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-xl">
                  {selectedEvent.title}
                </SheetTitle>
                <SheetDescription className="text-base text-gray-600 leading-relaxed">
                  {selectedEvent.briefSummary || selectedEvent.description}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(getEventDate(selectedEvent))}
                    </p>
                    {selectedEvent.dateEnd && selectedEvent.dateStart !== selectedEvent.dateEnd && (
                      <p className="text-sm text-gray-500">
                        through {formatDate(selectedEvent.dateEnd)}
                      </p>
                    )}
                    {selectedEvent.timeStart && (
                      <p className="text-sm text-gray-500">
                        {selectedEvent.timeStart}
                        {selectedEvent.timeEnd &&
                          ` - ${selectedEvent.timeEnd}`}
                      </p>
                    )}
                    {selectedEvent.isRecurring && selectedEvent.recurrencePattern && (
                      <p className="text-sm text-gray-500">
                        {selectedEvent.recurrencePattern}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                {(selectedEvent.locationName || selectedEvent.locationAddress) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      {selectedEvent.locationName && (
                        <p className="font-medium text-gray-900">
                          {selectedEvent.locationName}
                        </p>
                      )}
                      {selectedEvent.locationAddress && (
                        <p className="text-sm text-gray-500">
                          {selectedEvent.locationAddress}
                        </p>
                      )}
                      {(selectedEvent.locationCity || selectedEvent.locationState) && (
                        <p className="text-sm text-gray-500">
                          {[selectedEvent.locationCity, selectedEvent.locationState]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Virtual */}
                {selectedEvent.isVirtual && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-400 shrink-0" />
                    <p className="text-gray-900">Virtual Event</p>
                  </div>
                )}

                {/* Cost */}
                {formatCost(selectedEvent) && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400 shrink-0" />
                    <p className="text-gray-900">{formatCost(selectedEvent)}</p>
                  </div>
                )}

                {/* Difficulty */}
                {selectedEvent.difficultyLevel && (
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-gray-400 shrink-0" />
                    <p className="text-gray-900">{selectedEvent.difficultyLevel}</p>
                  </div>
                )}

                {/* Tags */}
                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvent.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market */}
                <div className="flex items-center gap-3 pt-2 border-t">
                  <MapPin className="h-4 w-4 text-gray-300 shrink-0" />
                  <p className="text-sm text-gray-400">{selectedEvent.marketName}</p>
                </div>

                {/* Source link */}
                {selectedEvent.sourceUrl && (
                  <a
                    href={selectedEvent.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2d4f50] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a6060] transition-colors mt-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Original Source
                  </a>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
