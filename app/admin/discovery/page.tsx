"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
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
import { Sparkles, Loader2, Plus, Zap } from "lucide-react";
import { pillarColors, runStatusColors } from "@/lib/pillars";
import Link from "next/link";

export default function DiscoveryPage() {
  const router = useRouter();
  const jobs = useQuery(api.eventDiscoveryJobs.list, {});
  const markets = useQuery(api.markets.list);
  const categories = useQuery(api.eventCategories.list, {});
  const createBatch = useMutation(api.eventDiscoveryJobs.createBatch);

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
            History of all event discovery jobs — click a job to see full
            details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-2 text-muted-foreground">
                No discovery jobs yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Run Full Discovery&quot; above to get started.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Category</TableHead>
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
                      <TableCell>{job.categoryName}</TableCell>
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
          )}
        </CardContent>
      </Card>

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
