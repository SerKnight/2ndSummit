"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketForm } from "@/components/markets/MarketForm";
import {
  ArrowLeft,
  Plus,
  Globe,
  ExternalLink,
  Play,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  Pencil,
  Check,
  Search,
  Copy,
  Trash2,
} from "lucide-react";
import Link from "next/link";

/** Client-side URL normalization matching the backend logic. */
function normalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw.trim().toLowerCase();
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid"];
  for (const param of trackingParams) {
    url.searchParams.delete(param);
  }
  let normalized = url.origin + url.pathname.replace(/\/+$/, "");
  const qs = url.searchParams.toString();
  if (qs) normalized += "?" + qs;
  if (url.hash) normalized += url.hash;
  return normalized;
}

type FilterTab = "all" | "active" | "errors" | "duplicates";

export default function EditMarketPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params.id as Id<"markets">;

  const market = useQuery(api.markets.get, { id: marketId });
  const updateMarket = useMutation(api.markets.update);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sources
  const crawlSources = useQuery(api.marketSources.list, {
    marketId: marketId,
  });
  const createMarketSource = useMutation(api.marketSources.create);
  const updateMarketSource = useMutation(api.marketSources.update);
  const removeMarketSource = useMutation(api.marketSources.remove);
  const triggerSingleCrawl = useMutation(
    api.eventDiscoveryJobs.triggerSingleCrawl
  );
  const triggerMarketCrawl = useMutation(
    api.eventDiscoveryJobs.triggerMarketCrawl
  );
  const regenerateSources = useMutation(api.markets.regenerateSources);

  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [crawlingSourceId, setCrawlingSourceId] = useState<string | null>(null);
  const [isCrawlingAll, setIsCrawlingAll] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSelector, setEditSelector] = useState("");
  const [editFrequency, setEditFrequency] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [isRemovingDupes, setIsRemovingDupes] = useState(false);
  const removeDuplicates = useMutation(api.marketSources.removeDuplicates);

  // Compute duplicate sets and stats
  const { duplicateIds, stats, filteredSources } = useMemo(() => {
    if (!crawlSources) return { duplicateIds: new Set<string>(), stats: null, filteredSources: [] };

    // Group by normalized URL to find duplicates
    const groups = new Map<string, typeof crawlSources>();
    for (const source of crawlSources) {
      const norm = normalizeUrl(source.url);
      const group = groups.get(norm);
      if (group) group.push(source);
      else groups.set(norm, [source]);
    }

    const dupeIds = new Set<string>();
    for (const group of groups.values()) {
      if (group.length > 1) {
        for (const s of group) dupeIds.add(s._id);
      }
    }

    const active = crawlSources.filter((s) => s.isActive).length;
    const errors = crawlSources.filter((s) => s.lastCrawlStatus === "error" || (s.consecutiveFailures ?? 0) >= 3).length;

    const computedStats = {
      total: crawlSources.length,
      active,
      disabled: crawlSources.length - active,
      errors,
      duplicates: dupeIds.size,
    };

    // Apply filters
    let filtered = crawlSources;
    if (filterTab === "active") filtered = filtered.filter((s) => s.isActive);
    else if (filterTab === "errors") filtered = filtered.filter((s) => s.lastCrawlStatus === "error" || (s.consecutiveFailures ?? 0) >= 3);
    else if (filterTab === "duplicates") filtered = filtered.filter((s) => dupeIds.has(s._id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) => s.url.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q)
      );
    }

    return { duplicateIds: dupeIds, stats: computedStats, filteredSources: filtered };
  }, [crawlSources, filterTab, searchQuery]);

  const handleSubmit = async (data: {
    name: string;
    regionDescription: string;
    latitude: number;
    longitude: number;
    radiusMiles: number;
    zipCode?: string;
    zipCodes?: string[];
  }) => {
    setIsSubmitting(true);
    try {
      await updateMarket({ id: marketId, ...data });
      toast.success("Market updated");
      router.push("/admin/markets");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update market"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSource = async () => {
    const url = newSourceUrl.trim();
    if (!url) return;
    try {
      await createMarketSource({
        marketId,
        url,
        name: newSourceName.trim() || undefined,
      });
      setNewSourceUrl("");
      setNewSourceName("");
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

  const handleCrawlNow = async (sourceId: Id<"marketSources">) => {
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

  const handleRegenerateSources = async () => {
    setIsGenerating(true);
    try {
      await regenerateSources({ id: marketId });
      toast.success("Source generation scheduled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to schedule source generation"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    setIsRemovingDupes(true);
    try {
      const result = await removeDuplicates({ marketId });
      toast.success(`Removed ${result.removed} duplicate source${result.removed === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove duplicates");
    } finally {
      setIsRemovingDupes(false);
    }
  };

  const handleCrawlAll = async () => {
    setIsCrawlingAll(true);
    try {
      await triggerMarketCrawl({ marketId });
      toast.success("Crawl scheduled for all sources");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule crawl"
      );
    } finally {
      setIsCrawlingAll(false);
    }
  };

  const startEditing = (source: {
    _id: string;
    name?: string;
    contentSelector?: string;
    crawlFrequency: string;
  }) => {
    setEditingSourceId(source._id);
    setEditName(source.name ?? "");
    setEditSelector(source.contentSelector ?? "");
    setEditFrequency(source.crawlFrequency);
  };

  const handleSaveEdit = async (id: Id<"marketSources">) => {
    try {
      await updateMarketSource({
        id,
        name: editName.trim() || undefined,
        contentSelector: editSelector.trim() || undefined,
        crawlFrequency: editFrequency,
      });
      setEditingSourceId(null);
      toast.success("Source updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update source"
      );
    }
  };

  const getSourceDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
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

  if (market === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (market === null) {
    return (
      <div className="space-y-4">
        <Link href="/admin/markets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Markets
          </Button>
        </Link>
        <p className="text-muted-foreground">Market not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/markets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit {market.name}
          </h1>
          <p className="text-muted-foreground">
            Update market settings and location
          </p>
        </div>
      </div>

      <MarketForm
        initialData={{
          name: market.name,
          regionDescription: market.regionDescription,
          latitude: market.latitude,
          longitude: market.longitude,
          radiusMiles: market.radiusMiles,
          zipCode: market.zipCode,
          zipCodes: market.zipCodes,
        }}
        onSubmit={handleSubmit}
        submitLabel="Update Market"
        isSubmitting={isSubmitting}
      />

      {/* Event Sources Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Event Sources
              </CardTitle>
              <CardDescription>
                URLs that are crawled to discover events in this market
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateSources}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                AI Generate
              </Button>
              {crawlSources && crawlSources.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleCrawlAll}
                  disabled={isCrawlingAll}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
                >
                  {isCrawlingAll ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-3.5 w-3.5" />
                  )}
                  Crawl All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add source form */}
          <div className="flex gap-2">
            <Input
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              placeholder="https://example.com/events"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSource();
                }
              }}
            />
            <Input
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Name (optional)"
              className="w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSource();
                }
              }}
            />
            <Button
              onClick={handleAddSource}
              disabled={!newSourceUrl.trim()}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Stats bar */}
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground border rounded-md px-3 py-2">
              <span>{stats.total} sources</span>
              <span className="text-green-600">{stats.active} active</span>
              {stats.disabled > 0 && (
                <span className="text-gray-500">{stats.disabled} disabled</span>
              )}
              {stats.errors > 0 && (
                <span className="text-red-600">{stats.errors} errors</span>
              )}
              {stats.duplicates > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Copy className="h-3 w-3" />
                  {stats.duplicates} duplicates
                </span>
              )}
              {stats.duplicates > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs text-amber-600 hover:text-amber-700"
                  onClick={handleRemoveDuplicates}
                  disabled={isRemovingDupes}
                >
                  {isRemovingDupes ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  Remove Duplicates
                </Button>
              )}
            </div>
          )}

          {/* Filter / search row */}
          {crawlSources && crawlSources.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter sources..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "active", "errors", "duplicates"] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant={filterTab === tab ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs capitalize"
                    onClick={() => setFilterTab(tab)}
                  >
                    {tab}
                    {tab === "errors" && stats && stats.errors > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{stats.errors}</Badge>
                    )}
                    {tab === "duplicates" && stats && stats.duplicates > 0 && (
                      <Badge className="ml-1 h-4 px-1 text-[10px] bg-amber-500">{stats.duplicates}</Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Source list */}
          {crawlSources === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : crawlSources.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <Globe className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No event sources yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Add URLs above or click &quot;AI Generate&quot; to
                auto-discover local event sources.
              </p>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No sources match the current filter.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSources.map((source) => (
                <div
                  key={source._id}
                  className="group rounded-lg border bg-card p-3"
                >
                  {editingSourceId === source._id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {source.url}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Display Name</Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder={getSourceDomain(source.url)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">CSS Selector</Label>
                          <Input
                            value={editSelector}
                            onChange={(e) => setEditSelector(e.target.value)}
                            placeholder="e.g. .events-list"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Frequency</Label>
                          <Select
                            value={editFrequency}
                            onValueChange={setEditFrequency}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="twice_weekly">
                                Twice Weekly
                              </SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSourceId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleSaveEdit(
                              source._id as Id<"marketSources">
                            )
                          }
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {source.name || getSourceDomain(source.url)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize shrink-0"
                            >
                              {source.crawlFrequency.replace("_", " ")}
                            </Badge>
                            {duplicateIds.has(source._id) && (
                              <Badge className="text-[10px] shrink-0 bg-amber-100 text-amber-700 border-amber-300" variant="outline">
                                <Copy className="mr-0.5 h-2.5 w-2.5" />
                                Duplicate
                              </Badge>
                            )}
                          </div>
                          <span className="block text-xs text-muted-foreground truncate">
                            {source.url}
                          </span>
                        </div>

                        {(source.consecutiveFailures ?? 0) >= 3 && (
                          <AlertTriangle
                            className="h-4 w-4 shrink-0 text-amber-500"
                            title={`${source.consecutiveFailures} consecutive failures`}
                          />
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditing(source)}
                            className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit source"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                            title="Open URL"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() =>
                              handleCrawlNow(
                                source._id as Id<"marketSources">
                              )
                            }
                            disabled={crawlingSourceId === source._id}
                            className="p-1 text-muted-foreground hover:text-emerald-600"
                            title="Crawl now"
                          >
                            {crawlingSourceId === source._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveSource(
                                source._id as Id<"marketSources">
                              )
                            }
                            className="p-1 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove source"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Crawl status row */}
                      {(source.lastCrawlStatus || !source.isActive) && (
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground pl-6">
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
                              <span>
                                {source.lastEventsFound} events found
                              </span>
                            )}
                          {source.totalEventsFound > 0 && (
                            <span>
                              {source.totalEventsFound} total
                            </span>
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
                        <p className="mt-1 text-xs text-red-600 pl-6 truncate">
                          {source.lastCrawlError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Context */}
      {market.sourcePromptContext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Market Context</CardTitle>
            <CardDescription>
              AI-generated context about this market&apos;s event ecosystem —
              included in every discovery prompt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {market.sourcePromptContext}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
