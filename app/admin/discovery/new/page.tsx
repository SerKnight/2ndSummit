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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Loader2, Eye, Settings2 } from "lucide-react";
import Link from "next/link";
import { pillarColors, PILLARS } from "@/lib/pillars";
import { applyTemplate } from "@/lib/promptVariables";

export default function NewDiscoveryRunPage() {
  const router = useRouter();

  // Data
  const markets = useQuery(api.markets.list);
  const categories = useQuery(api.categories.list, {});
  const templates = useQuery(api.promptTemplates.list);
  const defaultTemplate = useQuery(api.promptTemplates.getDefault);

  // Form state
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set()
  );
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const [timeRangeDays, setTimeRangeDays] = useState("90");
  const [radiusMiles, setRadiusMiles] = useState<string>("");
  const [batchSize, setBatchSize] = useState("4");
  const [temperature, setTemperature] = useState("0.1");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [searchRecencyFilter, setSearchRecencyFilter] = useState("month");
  const [showPreview, setShowPreview] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const createRun = useMutation(api.discoveryRuns.create);
  const seedTemplates = useMutation(api.promptTemplates.seed);

  // Initialize categories when loaded
  if (categories && !categoriesInitialized) {
    setSelectedCategoryIds(new Set(categories.map((c) => c._id)));
    setCategoriesInitialized(true);
  }

  // Initialize template when loaded
  if (defaultTemplate && !selectedTemplateId) {
    setSelectedTemplateId(defaultTemplate._id);
  }

  // Resolve selected market
  const market = useMemo(
    () => markets?.find((m) => m._id === selectedMarket),
    [markets, selectedMarket]
  );

  // When market changes, update radius default
  const handleMarketChange = (id: string) => {
    setSelectedMarket(id);
    const m = markets?.find((mk) => mk._id === id);
    if (m) setRadiusMiles(String(m.radiusMiles));
  };

  // Resolve selected template
  const selectedTemplate = useMemo(
    () => templates?.find((t) => t._id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Category grouping
  const categoryGroups = useMemo(() => {
    if (!categories) return {};
    const groups: Record<string, typeof categories> = {};
    for (const pillar of PILLARS) {
      groups[pillar] = categories.filter((c) => c.pillar === pillar);
    }
    return groups;
  }, [categories]);

  // Toggle category
  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all in a pillar
  const togglePillar = (pillar: string) => {
    const pillarCats = categoryGroups[pillar] ?? [];
    const allSelected = pillarCats.every((c) => selectedCategoryIds.has(c._id));
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      for (const c of pillarCats) {
        if (allSelected) next.delete(c._id);
        else next.add(c._id);
      }
      return next;
    });
  };

  // Toggle all
  const toggleAll = () => {
    if (!categories) return;
    const allSelected = categories.every((c) => selectedCategoryIds.has(c._id));
    if (allSelected) {
      setSelectedCategoryIds(new Set());
    } else {
      setSelectedCategoryIds(new Set(categories.map((c) => c._id)));
    }
  };

  // Generate preview
  const previewPrompt = useMemo(() => {
    if (!selectedTemplate || !market) return null;
    const sampleCategories = categories
      ?.filter((c) => selectedCategoryIds.has(c._id))
      ?.slice(0, Number(batchSize))
      ?.map((c) => c.name)
      .join(", ");
    return applyTemplate(selectedTemplate.userPromptTemplate, {
      categoryNames: sampleCategories || "Walking Groups, Hiking",
      radiusMiles: radiusMiles || String(market.radiusMiles),
      marketName: market.name,
      regionDescription: market.regionDescription,
      latitude: String(market.latitude),
      longitude: String(market.longitude),
      timeRange: `next ${timeRangeDays} days`,
      todaysDate: new Date().toISOString().split("T")[0],
    });
  }, [
    selectedTemplate,
    market,
    categories,
    selectedCategoryIds,
    batchSize,
    radiusMiles,
    timeRangeDays,
  ]);

  // Run discovery
  const handleRun = async () => {
    if (!selectedMarket) {
      toast.error("Please select a market");
      return;
    }
    if (selectedCategoryIds.size === 0) {
      toast.error("Please select at least one category");
      return;
    }

    setIsRunning(true);
    try {
      const runId = await createRun({
        marketId: selectedMarket as Id<"markets">,
        categoryIds: Array.from(selectedCategoryIds) as Id<"categories">[],
        radiusMiles: Number(radiusMiles) || undefined,
        timeRangeDays: Number(timeRangeDays),
        batchSize: Number(batchSize),
        temperature: Number(temperature),
        searchRecencyFilter,
        model: "sonar",
        promptTemplateId: selectedTemplateId
          ? (selectedTemplateId as Id<"promptTemplates">)
          : undefined,
      });
      toast.success("Discovery run started");
      router.push(`/admin/discovery/runs/${runId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start discovery"
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Seed templates if none exist
  const handleSeedTemplates = async () => {
    try {
      const result = await seedTemplates();
      if (result.seeded) {
        toast.success("Default prompt template created");
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error("Failed to seed templates");
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
            New Discovery Run
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
          <Select value={selectedMarket} onValueChange={handleMarketChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a market" />
            </SelectTrigger>
            <SelectContent>
              {markets?.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.name} — {m.regionDescription}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {market && (
            <div className="grid grid-cols-3 gap-4 rounded-md bg-muted/50 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Region: </span>
                {market.regionDescription}
              </div>
              <div>
                <span className="text-muted-foreground">Default Radius: </span>
                {market.radiusMiles} miles
              </div>
              <div>
                <span className="text-muted-foreground">Coordinates: </span>
                {market.latitude.toFixed(4)}, {market.longitude.toFixed(4)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Select which event categories to search for
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedCategoryIds.size} of {categories?.length ?? 0} selected
              </span>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {categories &&
                categories.every((c) => selectedCategoryIds.has(c._id))
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!categories ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {PILLARS.map((pillar) => {
                const pillarCats = categoryGroups[pillar] ?? [];
                const allSelected = pillarCats.every((c) =>
                  selectedCategoryIds.has(c._id)
                );
                const someSelected = pillarCats.some((c) =>
                  selectedCategoryIds.has(c._id)
                );
                return (
                  <div key={pillar}>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={pillarColors[pillar] || ""}
                      >
                        {pillar}
                      </Badge>
                      <button
                        onClick={() => togglePillar(pillar)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                      {someSelected && !allSelected && (
                        <span className="text-xs text-muted-foreground">
                          ({pillarCats.filter((c) => selectedCategoryIds.has(c._id)).length}/{pillarCats.length})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pillarCats.map((cat) => {
                        const selected = selectedCategoryIds.has(cat._id);
                        return (
                          <button
                            key={cat._id}
                            onClick={() => toggleCategory(cat._id)}
                            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                    {pillar !== "Connect" && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Search Parameters
          </CardTitle>
          <CardDescription>
            Fine-tune how the AI searches for events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {/* Time Range */}
            <div className="space-y-2">
              <Label>Time Range</Label>
              <ToggleGroup
                type="single"
                value={timeRangeDays}
                onValueChange={(val) => val && setTimeRangeDays(val)}
                className="justify-start"
              >
                <ToggleGroupItem value="30" className="text-xs">
                  30 days
                </ToggleGroupItem>
                <ToggleGroupItem value="60" className="text-xs">
                  60 days
                </ToggleGroupItem>
                <ToggleGroupItem value="90" className="text-xs">
                  90 days
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Radius */}
            <div className="space-y-2">
              <Label>
                Radius (miles)
                {market && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    default: {market.radiusMiles}
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(e.target.value)}
                placeholder={market ? String(market.radiusMiles) : "25"}
                min={1}
                max={200}
              />
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <ToggleGroup
                type="single"
                value={batchSize}
                onValueChange={(val) => val && setBatchSize(val)}
                className="justify-start"
              >
                <ToggleGroupItem value="2" className="text-xs">
                  2
                </ToggleGroupItem>
                <ToggleGroupItem value="3" className="text-xs">
                  3
                </ToggleGroupItem>
                <ToggleGroupItem value="4" className="text-xs">
                  4
                </ToggleGroupItem>
                <ToggleGroupItem value="5" className="text-xs">
                  5
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                Categories per API call
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, higher = more creative
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label>Search Recency</Label>
            <ToggleGroup
              type="single"
              value={searchRecencyFilter}
              onValueChange={(val) => val && setSearchRecencyFilter(val)}
              className="justify-start"
            >
              <ToggleGroupItem value="day" className="text-xs">
                Day
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="text-xs">
                Week
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-xs">
                Month
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              How recent the web sources should be
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Template */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt Template</CardTitle>
              <CardDescription>
                The AI instructions that guide the event search
              </CardDescription>
            </div>
            <Link href="/admin/discovery/templates">
              <Button variant="outline" size="sm">
                Manage Templates
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates && templates.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                No prompt templates yet. Create a default template to get
                started.
              </p>
              <Button onClick={handleSeedTemplates}>
                Create Default Template
              </Button>
            </div>
          ) : (
            <>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                      {t.isDefault && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <div className="space-y-3">
                  {selectedTemplate.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.description}
                    </p>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      System Prompt
                    </Label>
                    <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                      {selectedTemplate.systemPrompt}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        User Prompt Template
                      </Label>
                      {market && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                          className="h-6 text-xs"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          {showPreview ? "Show Template" : "Preview with Values"}
                        </Button>
                      )}
                    </div>
                    <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                      {showPreview && previewPrompt
                        ? previewPrompt
                        : selectedTemplate.userPromptTemplate.replace(
                            /\{\{(\w+)\}\}/g,
                            (match) =>
                              `\u00AB${match}\u00BB`
                          )}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          {selectedMarket && selectedCategoryIds.size > 0 ? (
            <>
              Ready to search{" "}
              <strong>{selectedCategoryIds.size} categories</strong> in{" "}
              <strong>{market?.name}</strong> over{" "}
              <strong>{timeRangeDays} days</strong>
              {" · "}
              {Math.ceil(selectedCategoryIds.size / Number(batchSize))} API
              calls
            </>
          ) : (
            "Select a market and categories to begin"
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/admin/discovery">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleRun}
            disabled={
              !selectedMarket || selectedCategoryIds.size === 0 || isRunning
            }
          >
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Starting..." : "Run Discovery"}
          </Button>
        </div>
      </div>
    </div>
  );
}
