"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { ApprovedEvent } from "@/lib/calendar-types";
import {
  getEventsForDate,
  groupEventsByPillar,
  formatDateParam,
} from "@/lib/calendar-utils";
import { PILLAR_STYLES } from "@/lib/pillars";
import { EventCard } from "./EventCard";
import { useMemo } from "react";

interface DayViewProps {
  events: ApprovedEvent[];
  date: Date;
  onDateChange?: (date: Date) => void;
  onEventClick: (event: ApprovedEvent) => void;
  showNavigation?: boolean;
}

export function DayView({
  events,
  date,
  onDateChange,
  onEventClick,
  showNavigation = true,
}: DayViewProps) {
  const dayEvents = useMemo(() => getEventsForDate(events, date), [events, date]);
  const grouped = useMemo(() => groupEventsByPillar(dayEvents), [dayEvents]);

  const pillarOrder = ["Move", "Discover", "Connect"];
  const sortedPillars = Object.keys(grouped).sort((a, b) => {
    const ai = pillarOrder.indexOf(a);
    const bi = pillarOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onDateChange?.(d);
  }

  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    onDateChange?.(d);
  }

  function goToToday() {
    onDateChange?.(new Date());
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {showNavigation && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{dateLabel}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={prevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {dayEvents.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-gray-200 bg-white shadow-sm">
          <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-800 text-lg">No experiences on this day</p>
          <p className="text-gray-500 text-sm mt-1">
            Try checking a different date or adjusting your filters
          </p>
        </div>
      ) : (
        sortedPillars.map((pillar) => {
          const style = PILLAR_STYLES[pillar] ?? {
            badge: "bg-gray-100 text-gray-700 border-gray-300",
            border: "border-gray-400",
          };
          return (
            <div key={pillar} className="space-y-2">
              <div className={cn("flex items-center gap-2 border-l-4 pl-3 py-1", style.border)}>
                <h3 className="text-sm font-semibold text-gray-700">{pillar}</h3>
                <span className="text-xs text-gray-400">
                  {grouped[pillar].length} event{grouped[pillar].length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2 pl-4">
                {grouped[pillar].map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onClick={() => onEventClick(event)}
                    showDate={false}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
