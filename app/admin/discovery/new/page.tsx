"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Sparkles, Loader2, Eye } from "lucide-react";
import Link from "next/link";
import { pillarColors } from "@/lib/pillars";

export default function NewDiscoveryJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMarket = searchParams.get("market") ?? "";

  // Data
  const markets = useQuery(api.markets.list);
  const categories = useQuery(api.eventCategories.list, {});

  // Form state
  const [selectedMarket, setSelectedMarket] = useState<string>(preselectedMarket);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dateRangeStart, setDateRangeStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateRangeEnd, setDateRangeEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const createJob = useMutation(api.eventDiscoveryJobs.create);

  // Resolve selected market & category
  const market = useMemo(
    () => markets?.find((m) => m._id === selectedMarket),
    [markets, selectedMarket]
  );

  const category = useMemo(
    () => categories?.find((c) => c._id === selectedCategory),
    [categories, selectedCategory]
  );

  // Active categories only
  const activeCategories = useMemo(
    () => categories?.filter((c) => c.isActive) ?? [],
    [categories]
  );

  // Run discovery
  const handleRun = async () => {
    if (!selectedMarket) {
      toast.error("Please select a market");
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    setIsRunning(true);
    try {
      const jobId = await createJob({
        marketId: selectedMarket as Id<"markets">,
        categoryId: selectedCategory as Id<"eventCategories">,
        dateRangeStart,
        dateRangeEnd,
      });
      toast.success("Event discovery job started");
      router.push(`/admin/discovery/runs/${jobId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start discovery"
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/discovery">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            New Event Discovery Job
          </h1>
          <p className="text-muted-foreground">
            Configure and launch an AI-powered event search
          </p>
        </div>
      </div>

      {/* Market Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Market</CardTitle>
          <CardDescription>
            Choose the geographic area to search for events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!markets ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger>
                <SelectValue placeholder="Select a market" />
              </SelectTrigger>
              <SelectContent>
                {markets
                  .filter((m) => m.isActive)
                  .map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} — {m.regionDescription}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {market && (
            <div className="grid grid-cols-3 gap-4 rounded-md bg-muted/50 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Region: </span>
                {market.regionDescription}
              </div>
              <div>
                <span className="text-muted-foreground">Radius: </span>
                {market.radiusMiles} miles
              </div>
              <div>
                <span className="text-muted-foreground">Sources: </span>
                {market.searchSources?.length ?? 0} configured
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Category</CardTitle>
          <CardDescription>
            Select a single event category to search for (one per job for
            quality)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!categories ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    <span className="flex items-center gap-2">
                      {c.name}
                      <Badge
                        variant="outline"
                        className={`ml-1 text-xs ${pillarColors[c.pillar] || ""}`}
                      >
                        {c.pillar}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {category && (
            <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
              {category.searchSubPrompt ? (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Search Sub-Prompt:
                  </span>
                  <p className="mt-0.5 text-xs">{category.searchSubPrompt}</p>
                </div>
              ) : (
                <p className="text-xs text-yellow-600">
                  No search sub-prompt generated yet — the system will use a
                  generic prompt.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>
            The time window to search for events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Preview */}
      {market && category && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prompt Preview</CardTitle>
                <CardDescription>
                  The assembled prompt that will be sent to Perplexity
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
            </div>
          </CardHeader>
          {showPreview && (
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Market Context
                  </Label>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                    {market.name} — {market.regionDescription}
                    {market.sourcePromptContext &&
                      `\n\nSource Context:\n${market.sourcePromptContext}`}
                    {market.searchSources && market.searchSources.length > 0 &&
                      `\n\nKnown Sources:\n${market.searchSources.join("\n")}`}
                  </pre>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Category Sub-Prompt
                  </Label>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                    {category.searchSubPrompt || "(No sub-prompt — generic search will be used)"}
                  </pre>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Date Window
                  </Label>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                    {dateRangeStart} to {dateRangeEnd}
                  </pre>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          {selectedMarket && selectedCategory ? (
            <>
              Ready to search <strong>{category?.name}</strong> events in{" "}
              <strong>{market?.name}</strong> from{" "}
              <strong>{dateRangeStart}</strong> to{" "}
              <strong>{dateRangeEnd}</strong>
            </>
          ) : (
            "Select a market and category to begin"
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/admin/discovery">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleRun}
            disabled={!selectedMarket || !selectedCategory || isRunning}
          >
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Starting..." : "Run Event Discovery"}
          </Button>
        </div>
      </div>
    </div>
  );
}
