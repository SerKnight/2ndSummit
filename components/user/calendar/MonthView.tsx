"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ApprovedEvent } from "@/lib/calendar-types";
import {
  MONTH_NAMES,
  DAY_NAMES,
  getDaysInMonth,
  getFirstDayOfMonth,
  getEventDate,
  parseEventDate,
  formatDateParam,
  dateKey,
  buildEventsByDate,
} from "@/lib/calendar-utils";
import { PILLAR_STYLES } from "@/lib/pillars";
import { useMemo } from "react";

interface MonthViewProps {
  events: ApprovedEvent[];
  currentYear: number;
  currentMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onEventClick: (event: ApprovedEvent) => void;
  searchParams: string;
}

export function MonthView({
  events,
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onEventClick,
  searchParams,
}: MonthViewProps) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const eventsByDate = useMemo(() => buildEventsByDate(events), [events]);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  function dayLink(day: number) {
    const date = new Date(currentYear, currentMonth, day);
    const param = formatDateParam(date);
    return searchParams ? `/calendar/${param}?${searchParams}` : `/calendar/${param}`;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={onPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextMonth}>
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
          const key = day ? dateKey(currentYear, currentMonth, day) : null;
          const dayEvents = key ? eventsByDate[key] || [] : [];

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
                  <Link
                    href={dayLink(day)}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-gray-100 transition-colors",
                      isToday(day)
                        ? "bg-[#2d4f50] text-white font-bold hover:bg-[#3a6060]"
                        : "text-gray-700"
                    )}
                  >
                    {day}
                  </Link>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const style =
                        PILLAR_STYLES[event.pillar ?? ""] ?? PILLAR_STYLES.Discover;
                      return (
                        <button
                          key={event._id}
                          onClick={() => onEventClick(event)}
                          className={cn(
                            "w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate border transition-colors cursor-pointer",
                            style.bg,
                            style.text,
                          )}
                          title={event.title}
                        >
                          <span
                            className={cn(
                              "inline-block h-1.5 w-1.5 rounded-full mr-1 -mt-0.5",
                              style.dot,
                            )}
                          />
                          {event.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <Link
                        href={dayLink(day)}
                        className="block text-xs text-gray-500 pl-1 hover:text-gray-700"
                      >
                        +{dayEvents.length - 3} more
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
