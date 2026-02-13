"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterState, DerivedFilterOptions } from "@/lib/calendar-types";

interface Market {
  _id: string;
  name: string;
}

interface CalendarFilterBarProps {
  filters: FilterState;
  derivedOptions: DerivedFilterOptions;
  markets: Market[] | undefined;
  onFilterChange: (key: keyof FilterState, value: string) => void;
}

export function CalendarFilterBar({
  filters,
  derivedOptions,
  markets,
  onFilterChange,
}: CalendarFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Market — always visible */}
      <Select
        value={filters.market}
        onValueChange={(v) => onFilterChange("market", v)}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="All Markets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Markets</SelectItem>
          {markets?.map((m) => (
            <SelectItem key={m._id} value={m._id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Pillar */}
      {derivedOptions.pillars.length > 1 && (
        <Select
          value={filters.pillar}
          onValueChange={(v) => onFilterChange("pillar", v)}
        >
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {derivedOptions.pillars.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Cost Type */}
      {derivedOptions.costTypes.length > 1 && (
        <Select
          value={filters.costType}
          onValueChange={(v) => onFilterChange("costType", v)}
        >
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="All Costs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Costs</SelectItem>
            {derivedOptions.costTypes.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Difficulty */}
      {derivedOptions.difficulties.length > 1 && (
        <Select
          value={filters.difficulty}
          onValueChange={(v) => onFilterChange("difficulty", v)}
        >
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {derivedOptions.difficulties.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Category */}
      {derivedOptions.categories.length > 1 && (
        <Select
          value={filters.category}
          onValueChange={(v) => onFilterChange("category", v)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {derivedOptions.categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Virtual / In-Person */}
      {derivedOptions.hasVirtual && (
        <Select
          value={filters.virtual}
          onValueChange={(v) => onFilterChange("virtual", v)}
        >
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="in-person">In-Person</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
