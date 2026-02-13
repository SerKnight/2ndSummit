"use client";

import { CalendarDays, CalendarRange, Calendar, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar-types";

interface ViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const views: { value: CalendarView; label: string; icon: typeof CalendarDays }[] = [
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "day", label: "Day", icon: Calendar },
  { value: "list", label: "List", icon: List },
];

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 bg-white p-1">
      {views.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onViewChange(value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            view === value
              ? "bg-[#2d4f50] text-white"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Icon className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
