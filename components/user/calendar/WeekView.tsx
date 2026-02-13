"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ApprovedEvent } from "@/lib/calendar-types";
import {
  MONTH_NAMES,
  DAY_NAMES,
  getWeekDays,
  getEventsForDate,
  formatDateParam,
} from "@/lib/calendar-utils";
import { EventCard } from "./EventCard";

interface WeekViewProps {
  events: ApprovedEvent[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (event: ApprovedEvent) => void;
  searchParams: string;
}

export function WeekView({
  events,
  selectedDate,
  onDateChange,
  onEventClick,
  searchParams,
}: WeekViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = getWeekDays(selectedDate);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  function prevWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    onDateChange(d);
  }

  function nextWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    onDateChange(d);
  }

  function goToThisWeek() {
    onDateChange(new Date());
  }

  function formatHeader() {
    const sameMonth = firstDay.getMonth() === lastDay.getMonth();
    const sameYear = firstDay.getFullYear() === lastDay.getFullYear();

    if (sameMonth) {
      return `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getDate()} – ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    }
    if (sameYear) {
      return `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getDate()} – ${MONTH_NAMES[lastDay.getMonth()]} ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    }
    return `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getDate()}, ${firstDay.getFullYear()} – ${MONTH_NAMES[lastDay.getMonth()]} ${lastDay.getDate()}, ${lastDay.getFullYear()}`;
  }

  function dayLink(date: Date) {
    const param = formatDateParam(date);
    return searchParams ? `/calendar/${param}?${searchParams}` : `/calendar/${param}`;
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Week of {formatHeader()}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToThisWeek}>
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7">
        {weekDays.map((date, idx) => {
          const dayEvents = getEventsForDate(events, date);
          const isCurrentDay = isSameDay(date, today);

          return (
            <div
              key={idx}
              className={cn(
                "border-b lg:border-b-0 lg:border-r last:border-r-0 p-3 min-h-[120px]",
              )}
            >
              <Link
                href={dayLink(date)}
                className="flex lg:flex-col items-center lg:items-center gap-2 lg:gap-0 mb-3 hover:opacity-80"
              >
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {DAY_NAMES[idx]}
                </span>
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isCurrentDay
                      ? "bg-[#2d4f50] text-white"
                      : "text-gray-700"
                  )}
                >
                  {date.getDate()}
                </span>
              </Link>
              <div className="space-y-2">
                {dayEvents.map((event) => (
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
        })}
      </div>
    </div>
  );
}
