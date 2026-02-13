"use client";

import { Suspense, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { ApprovedEvent, CalendarView } from "@/lib/calendar-types";
import { useCalendarFilters } from "@/hooks/use-calendar-filters";
import { ViewToggle } from "@/components/user/calendar/ViewToggle";
import { CalendarFilterBar } from "@/components/user/calendar/CalendarFilterBar";
import { MonthView } from "@/components/user/calendar/MonthView";
import { WeekView } from "@/components/user/calendar/WeekView";
import { DayView } from "@/components/user/calendar/DayView";
import { ListView } from "@/components/user/calendar/ListView";
import { EventDetailSheet } from "@/components/user/calendar/EventDetailSheet";

function CalendarContent() {
  const today = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEvent, setSelectedEvent] = useState<ApprovedEvent | null>(null);

  const markets = useQuery(api.events.listActiveMarkets);

  // First call: read filter state from URL to get marketId for the query
  const { filters, setFilter, searchParamsString } = useCalendarFilters(undefined);

  const rawEvents = useQuery(api.events.listApproved, {
    marketId: filters.market === "all" ? undefined : (filters.market as Id<"markets">),
  });

  // Second call: compute derived options + filtered events from the data
  const { derivedOptions, filteredEvents, upcomingEvents } =
    useCalendarFilters(rawEvents ?? undefined);

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
    const t = new Date();
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
  }

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
          <ViewToggle view={view} onViewChange={setView} />
          <CalendarFilterBar
            filters={filters}
            derivedOptions={derivedOptions}
            markets={markets}
            onFilterChange={setFilter}
          />
        </div>

        {/* Views */}
        {view === "month" && (
          <MonthView
            events={filteredEvents}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onToday={goToToday}
            onEventClick={setSelectedEvent}
            searchParams={searchParamsString}
          />
        )}

        {view === "week" && (
          <WeekView
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onEventClick={setSelectedEvent}
            searchParams={searchParamsString}
          />
        )}

        {view === "day" && (
          <DayView
            events={filteredEvents}
            date={selectedDate}
            onDateChange={setSelectedDate}
            onEventClick={setSelectedEvent}
          />
        )}

        {view === "list" && (
          <ListView
            events={upcomingEvents}
            loading={!rawEvents}
            onEventClick={setSelectedEvent}
          />
        )}

        {/* Event count footer */}
        {rawEvents && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {filteredEvents.length} curated experience{filteredEvents.length !== 1 ? "s" : ""}
            {filters.pillar !== "all" && ` in ${filters.pillar}`}
          </p>
        )}
      </div>

      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
