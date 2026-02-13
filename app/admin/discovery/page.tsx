"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sparkles, Loader2, Plus, Zap, Globe } from "lucide-react";
import { pillarColors, runStatusColors } from "@/lib/pillars";
import Link from "next/link";

const timeTabs = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
] as const;

function computeSince(timeFilter: string): number | undefined {
  const now = new Date();
  switch (timeFilter) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.getTime();
    }
    case "7d":
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    default:
      return undefined;
  }
}

const JOBS_PAGE_SIZE = 50;

export default function DiscoveryPage() {
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState<string>("7d");
  const since = useMemo(() => computeSince(timeFilter), [timeFilter]);

  const jobsQueryArgs = useMemo(() => {
    const args: { since?: number } = {};
    if (since) args.since = since;
    return args;
  }, [since]);

  const {
    results: jobs,
    status: jobsStatus,
    loadMore: loadMoreJobs,
  } = usePaginatedQuery(
    api.eventDiscoveryJobs.listPaginated,
    jobsQueryArgs,
    { initialNumItems: JOBS_PAGE_SIZE }
  );

  const markets = useQuery(api.markets.list);
  const categories = useQuery(api.eventCategories.list, {});
  const createBatch = useMutation(api.eventDiscoveryJobs.createBatch);
  const triggerMarketCrawl = useMutation(
    api.eventDiscoveryJobs.triggerMarketCrawl
  );

  // Crawl modal state
  const [crawlOpen, setCrawlOpen] = useState(false);
  const [crawlMarketId, setCrawlMarketId] = useState<string>("");
  const [isCrawling, setIsCrawling] = useState(false);

  // Batch modal state
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchMarketId, setBatchMarketId] = useState<string>("");
  const [batchDateStart, setBatchDateStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [batchDateEnd, setBatchDateEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set()
  );
  const [isLaunching, setIsLaunching] = useState(false);

  const activeCategories = useMemo(
    () => categories?.filter((c) => c.isActive) ?? [],
    [categories]
  );

  const activeMarkets = useMemo(
    () => markets?.filter((m) => m.isActive) ?? [],
    [markets]
  );

  // Group active categories by pillar
  const categoriesByPillar = useMemo(() => {
    const grouped: Record<string, typeof activeCategories> = {};
    for (const cat of activeCategories) {
      if (!grouped[cat.pillar]) grouped[cat.pillar] = [];
      grouped[cat.pillar].push(cat);
    }
    return grouped;
  }, [activeCategories]);

  const openBatchModal = () => {
    // Pre-select all active categories
    setSelectedCategoryIds(new Set(activeCategories.map((c) => c._id)));
    setBatchOpen(true);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePillar = (pillar: string) => {
    const pillarCats = categoriesByPillar[pillar] ?? [];
    const allSelected = pillarCats.every((c) =>
      selectedCategoryIds.has(c._id)
    );
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      for (const cat of pillarCats) {
        if (allSelected) next.delete(cat._id);
        else next.add(cat._id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCategoryIds.size === activeCategories.length) {
      setSelectedCategoryIds(new Set());
    } else {
      setSelectedCategoryIds(new Set(activeCategories.map((c) => c._id)));
    }
  };

  const handleLaunchBatch = async () => {
    if (!batchMarketId) {
      toast.error("Select a market");
      return;
    }
    if (selectedCategoryIds.size === 0) {
      toast.error("Select at least one category");
      return;
    }

    setIsLaunching(true);
    try {
      const jobIds = await createBatch({
        marketId: batchMarketId as Id<"markets">,
        categoryIds: Array.from(selectedCategoryIds) as Id<"eventCategories">[],
        dateRangeStart: batchDateStart,
        dateRangeEnd: batchDateEnd,
      });
      toast.success(
        `Launched ${jobIds.length} discovery ${jobIds.length === 1 ? "job" : "jobs"}`
      );
      setBatchOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to launch jobs"
      );
    } finally {
      setIsLaunching(false);
    }
  };

  const handleLaunchCrawl = async () => {
    if (!crawlMarketId) {
      toast.error("Select a market");
      return;
    }
    setIsCrawling(true);
    try {
      await triggerMarketCrawl({
        marketId: crawlMarketId as Id<"markets">,
      });
      toast.success("Crawl sources scheduled");
      setCrawlOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to launch crawl"
      );
    } finally {
      setIsCrawling(false);
    }
  };

  const formatDuration = (start: number, end?: number) => {
    if (!end) return "In progress...";
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const isRunning = (status: string) =>
    ["pending", "searching", "validating", "storing"].includes(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Event Discovery
          </h1>
          <p className="text-muted-foreground">
            Discover events using AI-powered web search
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setCrawlOpen(true)}
          >
            <Globe className="mr-2 h-4 w-4" />
            Crawl Sources
          </Button>
          <Link href="/admin/discovery/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Single Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Big AI Launch Button */}
      <button
        onClick={openBatchModal}
        className="group relative w-full overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-blue-950/80 p-6 text-left transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]"
      >
        {/* Animated gradient border glow */}
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20" />
        </div>

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 transition-shadow duration-300 group-hover:shadow-purple-500/50">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Run Full Discovery
              </h2>
              <p className="text-sm text-purple-200/70">
                Launch AI-powered event search across all categories in a market
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300 ring-1 ring-purple-500/20 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:text-purple-200 group-hover:ring-purple-500/40">
            <Sparkles className="h-4 w-4" />
            Configure &amp; Launch
          </div>
        </div>
      </button>

      {/* Discovery Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Event Discovery Jobs
          </CardTitle>
          <CardDescription>
            {jobs ? `${jobs.length} jobs loaded` : "Loading..."}
            {jobsStatus === "CanLoadMore" && " (more available)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time filter tabs */}
          <div className="flex items-center gap-1">
            {timeTabs.map((tab) => (
              <Button
                key={tab.value}
                variant={timeFilter === tab.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTimeFilter(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {jobsStatus === "LoadingFirstPage" ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-2 text-muted-foreground">
                No discovery jobs found for the selected time range.
              </p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Run Full Discovery&quot; above to get started.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Market</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Category / Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Validated</TableHead>
                      <TableHead>Stored</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow
                        key={job._id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/admin/discovery/runs/${job._id}`)
                        }
                      >
                        <TableCell className="font-medium">
                          {job.marketName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              job.discoveryMethod === "crawl"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-purple-100 text-purple-800 border-purple-300"
                            }
                          >
                            {job.discoveryMethod === "crawl" ? (
                              <Globe className="mr-1 h-3 w-3" />
                            ) : (
                              <Sparkles className="mr-1 h-3 w-3" />
                            )}
                            {job.discoveryMethod === "crawl" ? "Crawl" : "Search"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.discoveryMethod === "crawl"
                            ? job.sourceName ?? "—"
                            : job.categoryName}
                        </TableCell>
                        <TableCell>
                          {new Date(job.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={runStatusColors[job.status] || ""}
                          >
                            {isRunning(job.status) && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.eventsFound}</TableCell>
                        <TableCell>{job.eventsValidated ?? "—"}</TableCell>
                        <TableCell>{job.eventsStored ?? "—"}</TableCell>
                        <TableCell>
                          {formatDuration(job.startedAt, job.completedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {jobsStatus === "CanLoadMore" && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => loadMoreJobs(JOBS_PAGE_SIZE)}
                  >
                    Load More
                  </Button>
                </div>
              )}
              {jobsStatus === "LoadingMore" && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Crawl Sources Modal */}
      <Dialog open={crawlOpen} onOpenChange={setCrawlOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Globe className="h-4 w-4 text-white" />
              </div>
              Crawl Sources
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Market</Label>
              {!markets ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={crawlMarketId} onValueChange={setCrawlMarketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMarkets.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name} — {m.regionDescription}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Crawl all active sources for the selected market. Each source
              will be fetched, parsed, and events extracted via AI.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={handleLaunchCrawl}
                disabled={!crawlMarketId || isCrawling}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500"
              >
                {isCrawling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                {isCrawling ? "Scheduling..." : "Launch Crawl"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Launch Modal */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              Run Full Discovery
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Market Selection */}
            <div className="space-y-2">
              <Label>Market</Label>
              {!markets ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={batchMarketId} onValueChange={setBatchMarketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMarkets.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name} — {m.regionDescription}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={batchDateStart}
                  onChange={(e) => setBatchDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={batchDateEnd}
                  onChange={(e) => setBatchDateEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Categories</Label>
                <button
                  onClick={selectAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {selectedCategoryIds.size === activeCategories.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>

              {!categories ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  {Object.entries(categoriesByPillar).map(
                    ([pillar, cats]) => {
                      const allSelected = cats.every((c) =>
                        selectedCategoryIds.has(c._id)
                      );
                      const someSelected =
                        !allSelected &&
                        cats.some((c) => selectedCategoryIds.has(c._id));

                      return (
                        <div key={pillar} className="space-y-2">
                          {/* Pillar header */}
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={
                                allSelected
                                  ? true
                                  : someSelected
                                    ? "indeterminate"
                                    : false
                              }
                              onCheckedChange={() => togglePillar(pillar)}
                            />
                            <Badge
                              variant="outline"
                              className={`text-xs ${pillarColors[pillar] || ""}`}
                            >
                              {pillar}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {cats.filter((c) =>
                                selectedCategoryIds.has(c._id)
                              ).length}
                              /{cats.length}
                            </span>
                          </div>
                          {/* Category checkboxes */}
                          <div className="ml-6 grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {cats.map((cat) => (
                              <label
                                key={cat._id}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedCategoryIds.has(cat._id)}
                                  onCheckedChange={() =>
                                    toggleCategory(cat._id)
                                  }
                                />
                                <span className="truncate">{cat.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Summary & Launch */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">
                {batchMarketId && selectedCategoryIds.size > 0 ? (
                  <>
                    <strong>{selectedCategoryIds.size}</strong>{" "}
                    {selectedCategoryIds.size === 1 ? "job" : "jobs"} will be
                    launched for{" "}
                    <strong>
                      {activeMarkets.find((m) => m._id === batchMarketId)
                        ?.name ?? "selected market"}
                    </strong>
                  </>
                ) : (
                  "Select a market and categories to continue"
                )}
              </div>
              <Button
                onClick={handleLaunchBatch}
                disabled={
                  !batchMarketId ||
                  selectedCategoryIds.size === 0 ||
                  isLaunching
                }
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/40"
              >
                {isLaunching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                {isLaunching
                  ? "Launching..."
                  : `Launch ${selectedCategoryIds.size} ${selectedCategoryIds.size === 1 ? "Job" : "Jobs"}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
