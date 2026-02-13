import { useEffect, useState } from "react";
import { useDebounce } from "./use-debounce";

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function useNominatimSearch(query: string) {
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5`,
      { headers: { "Accept-Language": "en" } }
    )
      .then((res) => res.json())
      .then((data: NominatimResult[]) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return { results, isLoading };
}
