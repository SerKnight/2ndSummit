"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";
import type { ApprovedEvent, FilterState, DerivedFilterOptions } from "@/lib/calendar-types";
import { getEventDate, parseEventDate } from "@/lib/calendar-utils";

const DEFAULT_FILTER: FilterState = {
  market: "all",
  pillar: "all",
  costType: "all",
  difficulty: "all",
  category: "all",
  virtual: "all",
};

const FILTER_KEYS: (keyof FilterState)[] = [
  "market", "pillar", "costType", "difficulty", "category", "virtual",
];

export function useCalendarFilters(rawEvents: ApprovedEvent[] | undefined) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read filter state from URL search params
  const filters: FilterState = useMemo(() => {
    const state = { ...DEFAULT_FILTER };
    for (const key of FILTER_KEYS) {
      const val = searchParams.get(key);
      if (val) state[key] = val;
    }
    return state;
  }, [searchParams]);

  // Compute derived filter options from the dataset
  const derivedOptions: DerivedFilterOptions = useMemo(() => {
    const events = rawEvents ?? [];
    const pillars = new Set<string>();
    const costTypes = new Set<string>();
    const difficulties = new Set<string>();
    const categories = new Set<string>();
    let hasVirtual = false;

    for (const e of events) {
      if (e.pillar) pillars.add(e.pillar);
      if (e.costType) costTypes.add(e.costType);
      if (e.difficultyLevel) difficulties.add(e.difficultyLevel);
      if (e.categoryName && e.categoryName !== "Uncategorized") categories.add(e.categoryName);
      if (e.isVirtual) hasVirtual = true;
    }

    return {
      pillars: Array.from(pillars).sort(),
      costTypes: Array.from(costTypes).sort(),
      difficulties: Array.from(difficulties).sort(),
      categories: Array.from(categories).sort(),
      hasVirtual,
    };
  }, [rawEvents]);

  // Apply all client-side filters
  const filteredEvents = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents.filter((e) => {
      if (filters.pillar !== "all" && e.pillar !== filters.pillar) return false;
      if (filters.costType !== "all" && e.costType !== filters.costType) return false;
      if (filters.difficulty !== "all" && e.difficultyLevel !== filters.difficulty) return false;
      if (filters.category !== "all" && e.categoryName !== filters.category) return false;
      if (filters.virtual === "virtual" && !e.isVirtual) return false;
      if (filters.virtual === "in-person" && e.isVirtual) return false;
      return true;
    });
  }, [rawEvents, filters]);

  // Sorted upcoming events (today and future)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...filteredEvents]
      .filter((e) => {
        const d = parseEventDate(getEventDate(e));
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = parseEventDate(getEventDate(a));
        const db = parseEventDate(getEventDate(b));
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
  }, [filteredEvents]);

  // Update a single filter in URL params
  const setFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (key === "market") {
        // Market change resets all secondary filters
        for (const k of FILTER_KEYS) {
          params.delete(k);
        }
        if (value !== "all") {
          params.set("market", value);
        }
      } else {
        if (value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Build current search params string (for linking between views)
  const searchParamsString = useMemo(() => {
    return searchParams.toString();
  }, [searchParams]);

  return {
    filters,
    derivedOptions,
    filteredEvents,
    upcomingEvents,
    setFilter,
    searchParamsString,
  };
}
