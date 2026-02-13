"use client";

import { CalendarDays } from "lucide-react";
import type { ApprovedEvent } from "@/lib/calendar-types";
import { EventCard } from "./EventCard";

interface ListViewProps {
  events: ApprovedEvent[];
  loading: boolean;
  onEventClick: (event: ApprovedEvent) => void;
}

export function ListView({ events, loading, onEventClick }: ListViewProps) {
  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading curated experiences...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-800 text-lg">Nothing on the horizon just yet</p>
        <p className="text-gray-500 text-sm mt-1">
          Check back soon -- new experiences are always in the works
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          onClick={() => onEventClick(event)}
        />
      ))}
    </div>
  );
}
