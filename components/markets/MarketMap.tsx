"use client";

import dynamic from "next/dynamic";

export const MarketMap = dynamic(
  () =>
    import("./MarketMapInner").then((mod) => mod.MarketMapInner),
  { ssr: false, loading: () => <div className="flex h-[400px] items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">Loading map...</div> }
);
