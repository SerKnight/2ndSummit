"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
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
import type { ApprovedEvent } from "@/lib/calendar-types";
import { formatDate, getEventDate, formatCost } from "@/lib/calendar-utils";
import { PILLAR_STYLES } from "@/lib/pillars";

interface EventDetailSheetProps {
  event: ApprovedEvent | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  return (
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {event && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                {event.pillar && (
                  <Badge
                    className={
                      PILLAR_STYLES[event.pillar]?.badge ??
                      "bg-gray-100 text-gray-700"
                    }
                  >
                    {event.pillar}
                  </Badge>
                )}
                <Badge variant="outline">{event.categoryName}</Badge>
                {event.isRecurring && (
                  <Badge variant="outline" className="text-xs">
                    <Repeat className="mr-1 h-3 w-3" />
                    Recurring
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl">{event.title}</SheetTitle>
              <SheetDescription className="text-base text-gray-600 leading-relaxed">
                {event.briefSummary || event.description}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Date */}
              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">
                    {formatDate(getEventDate(event))}
                  </p>
                  {event.dateEnd && event.dateStart !== event.dateEnd && (
                    <p className="text-sm text-gray-500">
                      through {formatDate(event.dateEnd)}
                    </p>
                  )}
                  {event.timeStart && (
                    <p className="text-sm text-gray-500">
                      {event.timeStart}
                      {event.timeEnd && ` - ${event.timeEnd}`}
                    </p>
                  )}
                  {event.isRecurring && event.recurrencePattern && (
                    <p className="text-sm text-gray-500">
                      {event.recurrencePattern}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              {(event.locationName || event.locationAddress) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    {event.locationName && (
                      <p className="font-medium text-gray-900">
                        {event.locationName}
                      </p>
                    )}
                    {event.locationAddress && (
                      <p className="text-sm text-gray-500">
                        {event.locationAddress}
                      </p>
                    )}
                    {(event.locationCity || event.locationState) && (
                      <p className="text-sm text-gray-500">
                        {[event.locationCity, event.locationState]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Virtual */}
              {event.isVirtual && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-gray-400 shrink-0" />
                  <p className="text-gray-900">Virtual Event</p>
                </div>
              )}

              {/* Cost */}
              {formatCost(event) && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400 shrink-0" />
                  <p className="text-gray-900">{formatCost(event)}</p>
                </div>
              )}

              {/* Difficulty */}
              {event.difficultyLevel && (
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-gray-400 shrink-0" />
                  <p className="text-gray-900">{event.difficultyLevel}</p>
                </div>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map((tag) => (
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
                <p className="text-sm text-gray-400">{event.marketName}</p>
              </div>

              {/* Source link */}
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
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
  );
}
