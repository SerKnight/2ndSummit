"use client";

import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  DollarSign,
  Activity,
  Repeat,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovedEvent } from "@/lib/calendar-types";
import { parseEventDate, getEventDate, formatCost } from "@/lib/calendar-utils";
import { PILLAR_STYLES } from "@/lib/pillars";

interface EventCardProps {
  event: ApprovedEvent;
  onClick: () => void;
  showDate?: boolean;
}

export function EventCard({ event, onClick, showDate = true }: EventCardProps) {
  const style = PILLAR_STYLES[event.pillar ?? ""] ?? PILLAR_STYLES.Discover;
  const cost = formatCost(event);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {showDate && (
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
        )}

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
            <span className="text-gray-400">{event.categoryName}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
