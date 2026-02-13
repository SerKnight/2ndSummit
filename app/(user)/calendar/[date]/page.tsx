"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApprovedEvent } from "@/lib/calendar-types";
import { parseDateParam, formatDateParam } from "@/lib/calendar-utils";
import { useCalendarFilters } from "@/hooks/use-calendar-filters";
import { CalendarFilterBar } from "@/components/user/calendar/CalendarFilterBar";
import { DayView } from "@/components/user/calendar/DayView";
import { EventDetailSheet } from "@/components/user/calendar/EventDetailSheet";

function DayPageContent() {
  const params = useParams<{ date: string }>();
  const [selectedEvent, setSelectedEvent] = useState<ApprovedEvent | null>(null);

  const date = parseDateParam(params.date) ?? new Date();

  const markets = useQuery(api.events.listActiveMarkets);

  const { filters, setFilter, searchParamsString } = useCalendarFilters(undefined);

  const rawEvents = useQuery(api.events.listApproved, {
    marketId: filters.market === "all" ? undefined : (filters.market as Id<"markets">),
  });

  const { derivedOptions, filteredEvents } = useCalendarFilters(rawEvents ?? undefined);

  const prevDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  function navLink(d: Date) {
    const param = formatDateParam(d);
    return searchParamsString ? `/calendar/${param}?${searchParamsString}` : `/calendar/${param}`;
  }

  const backLink = searchParamsString ? `/calendar?${searchParamsString}` : "/calendar";

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back + Date Header */}
        <div className="mb-6">
          <Link
            href={backLink}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calendar
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {dateLabel}
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link href={navLink(prevDate)}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href={navLink(nextDate)}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <CalendarFilterBar
            filters={filters}
            derivedOptions={derivedOptions}
            markets={markets}
            onFilterChange={setFilter}
          />
        </div>

        {/* Day content */}
        <DayView
          events={filteredEvents}
          date={date}
          onEventClick={setSelectedEvent}
          showNavigation={false}
        />

        {/* Event count */}
        {rawEvents && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {filteredEvents.length} curated experience{filteredEvents.length !== 1 ? "s" : ""}
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

export default function DayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
          <p className="text-gray-500">Loading day view...</p>
        </div>
      }
    >
      <DayPageContent />
    </Suspense>
  );
}
