"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Sparkles,
  X,
  ExternalLink,
  Globe,
  Play,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MarketsPage() {
  const router = useRouter();
  const markets = useQuery(api.markets.list);
  const updateMarket = useMutation(api.markets.update);
  const removeMarket = useMutation(api.markets.remove);
  const regenerateSources = useMutation(api.markets.regenerateSources);

  // Market sources (crawl table)
  const createMarketSource = useMutation(api.marketSources.create);
  const removeMarketSource = useMutation(api.marketSources.remove);
  const triggerSingleCrawl = useMutation(
    api.eventDiscoveryJobs.triggerSingleCrawl
  );

  const [sheetMarketId, setSheetMarketId] = useState<Id<"markets"> | null>(
    null
  );
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [crawlingSourceId, setCrawlingSourceId] = useState<string | null>(null);

  // Query crawl sources for the selected market
  const crawlSources = useQuery(
    api.marketSources.list,
    sheetMarketId ? { marketId: sheetMarketId } : "skip"
  );

  const handleToggleActive = async (
    id: Id<"markets">,
    currentActive: boolean
  ) => {
    await updateMarket({ id, isActive: !currentActive });
    toast.success(currentActive ? "Market deactivated" : "Market activated");
  };

  const handleRegenerateSources = async (id: Id<"markets">) => {
    try {
      await regenerateSources({ id });
      toast.success("Source generation scheduled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to schedule source generation"
      );
    }
  };

  const handleAddSource = async (marketId: Id<"markets">) => {
    const url = newSourceUrl.trim();
    if (!url) return;
    try {
      await createMarketSource({ marketId, url });
      setNewSourceUrl("");
      toast.success("Source added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add source"
      );
    }
  };

  const handleRemoveSource = async (id: Id<"marketSources">) => {
    try {
      await removeMarketSource({ id });
      toast.success("Source removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove source"
      );
    }
  };

  const handleCrawlNow = async (
    sourceId: Id<"marketSources">,
    marketId: Id<"markets">
  ) => {
    setCrawlingSourceId(sourceId);
    try {
      await triggerSingleCrawl({ sourceId, marketId });
      toast.success("Crawl scheduled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule crawl"
      );
    } finally {
      setCrawlingSourceId(null);
    }
  };

  const sheetMarket = sheetMarketId
    ? markets?.find((m) => m._id === sheetMarketId)
    : null;

  const getSourceDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return hostname;
    } catch {
      return url;
    }
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground">
            Manage geographic regions for event discovery
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/markets/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Market
          </Link>
        </Button>
      </div>

      {markets === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            No markets yet. Create your first market to start discovering
            events.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.map((market) => (
                <TableRow
                  key={market._id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/markets/${market._id}/edit`)}
                >
                  <TableCell className="font-medium">
                    {market.name}
                  </TableCell>
                  <TableCell>{market.regionDescription}</TableCell>
                  <TableCell>{market.radiusMiles} mi</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSheetMarketId(market._id)}
                      className="inline-flex"
                    >
                      {market.sourceCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                        >
                          <Globe className="mr-1 h-3 w-3" />
                          {market.sourceCount} sources
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="cursor-pointer text-muted-foreground hover:bg-muted"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add sources
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>{market.eventCount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        market.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {market.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/markets/${market._id}/edit`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleActive(market._id, market.isActive)
                          }
                        >
                          {market.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSheetMarketId(market._id)}
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          Manage Sources
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/discovery/new?market=${market._id}`}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Discover Events
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={async () => {
                            if (
                              confirm(
                                "Delete this market? This cannot be undone."
                              )
                            ) {
                              await removeMarket({ id: market._id });
                              toast.success("Market deleted");
                            }
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Market Sources Sheet */}
      <Sheet
        open={!!sheetMarketId}
        onOpenChange={(open) => {
          if (!open) {
            setSheetMarketId(null);
            setNewSourceUrl("");
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {sheetMarket?.name ?? "Market"} — Sources
            </SheetTitle>
          </SheetHeader>

          {sheetMarket && (
            <div className="mt-6 space-y-6">
              {/* Market info summary */}
              <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Region: </span>
                  {sheetMarket.regionDescription}
                </div>
                <div>
                  <span className="text-muted-foreground">Radius: </span>
                  {sheetMarket.radiusMiles} mi
                </div>
                {sheetMarket.zipCode && (
                  <div>
                    <span className="text-muted-foreground">Zip: </span>
                    {sheetMarket.zipCode}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Events: </span>
                  {sheetMarket.eventCount}
                </div>
              </div>

              {/* Add source */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add a Source</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://example.com/events"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSource(sheetMarket._id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddSource(sheetMarket._id)}
                    disabled={!newSourceUrl.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add local event calendars, community sites, rec center pages,
                  or any URL that lists events in this market.
                </p>
              </div>

              {/* Event Sources */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Event Sources
                    {crawlSources && crawlSources.length > 0 && (
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({crawlSources.length})
                      </span>
                    )}
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleRegenerateSources(sheetMarket._id)
                    }
                  >
                    <Sparkles className="mr-2 h-3 w-3" />
                    AI Generate
                  </Button>
                </div>

                {crawlSources === undefined ? (
                  <Skeleton className="h-24 w-full" />
                ) : crawlSources.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center">
                    <Globe className="mx-auto h-6 w-6 text-muted-foreground/50" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      No sources yet. Add URLs above or click &quot;AI
                      Generate&quot; to auto-discover local event sources.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {crawlSources.map((source) => (
                      <li
                        key={source._id}
                        className="group rounded-md border bg-card px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-xs">
                              {source.name || getSourceDomain(source.url)}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {source.url}
                            </span>
                          </div>
                          {(source.consecutiveFailures ?? 0) >= 3 && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() =>
                              handleCrawlNow(source._id, sheetMarket._id)
                            }
                            disabled={crawlingSourceId === source._id}
                            className="shrink-0 text-muted-foreground hover:text-emerald-600"
                            title="Crawl now"
                          >
                            {crawlingSourceId === source._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveSource(source._id)}
                            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Crawl metadata */}
                        {(source.lastCrawlStatus || !source.isActive) && (
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            {source.lastCrawlStatus && (
                              <Badge
                                variant="outline"
                                className={
                                  source.lastCrawlStatus === "success"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : source.lastCrawlStatus === "error"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-gray-50 text-gray-600"
                                }
                              >
                                {source.lastCrawlStatus}
                              </Badge>
                            )}
                            {source.lastCrawledAt && (
                              <span>
                                {formatTimeAgo(source.lastCrawledAt)}
                              </span>
                            )}
                            {source.lastEventsFound != null &&
                              source.lastEventsFound > 0 && (
                                <span>{source.lastEventsFound} events</span>
                              )}
                            {!source.isActive && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700"
                              >
                                Disabled
                              </Badge>
                            )}
                          </div>
                        )}
                        {source.lastCrawlError && (
                          <p className="mt-1 text-xs text-red-600 truncate">
                            {source.lastCrawlError}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Source prompt context */}
              {sheetMarket.sourcePromptContext && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Market Context
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    AI-generated context about this market&apos;s event
                    ecosystem. Included in every discovery prompt.
                  </p>
                  <div className="rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {sheetMarket.sourcePromptContext}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
