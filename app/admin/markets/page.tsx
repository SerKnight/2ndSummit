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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  RefreshCw,
  X,
  ExternalLink,
  Globe,
} from "lucide-react";
import Link from "next/link";

export default function MarketsPage() {
  const markets = useQuery(api.markets.list);
  const createMarket = useMutation(api.markets.create);
  const updateMarket = useMutation(api.markets.update);
  const removeMarket = useMutation(api.markets.remove);
  const regenerateSources = useMutation(api.markets.regenerateSources);
  const addSource = useMutation(api.markets.addSource);
  const removeSource = useMutation(api.markets.removeSource);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetMarketId, setSheetMarketId] = useState<Id<"markets"> | null>(
    null
  );
  const [editingId, setEditingId] = useState<Id<"markets"> | null>(null);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    regionDescription: "",
    latitude: "",
    longitude: "",
    radiusMiles: "",
    zipCodes: "",
    zipCode: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      regionDescription: "",
      latitude: "",
      longitude: "",
      radiusMiles: "",
      zipCodes: "",
      zipCode: "",
    });
    setEditingId(null);
  };

  const openEdit = (market: NonNullable<typeof markets>[number]) => {
    setForm({
      name: market.name,
      regionDescription: market.regionDescription,
      latitude: market.latitude.toString(),
      longitude: market.longitude.toString(),
      radiusMiles: market.radiusMiles.toString(),
      zipCodes: market.zipCodes?.join(", ") || "",
      zipCode: market.zipCode || "",
    });
    setEditingId(market._id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: form.name,
        regionDescription: form.regionDescription,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radiusMiles: parseFloat(form.radiusMiles),
        zipCodes: form.zipCodes
          ? form.zipCodes
              .split(",")
              .map((z) => z.trim())
              .filter(Boolean)
          : undefined,
        zipCode: form.zipCode || undefined,
      };

      if (editingId) {
        await updateMarket({ id: editingId, ...data });
        toast.success("Market updated");
      } else {
        await createMarket(data);
        toast.success("Market created");
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save market"
      );
    }
  };

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
      await addSource({ id: marketId, source: url });
      setNewSourceUrl("");
      toast.success("Source added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add source"
      );
    }
  };

  const handleRemoveSource = async (
    marketId: Id<"markets">,
    source: string
  ) => {
    try {
      await removeSource({ id: marketId, source });
      toast.success("Source removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove source"
      );
    }
  };

  const sheetMarket = sheetMarketId
    ? markets?.find((m) => m._id === sheetMarketId)
    : null;

  // Try to extract a display name from a URL
  const getSourceDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return hostname;
    } catch {
      return url;
    }
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
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Market
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Market" : "Add Market"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Denver Metro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Region Description</Label>
                <Input
                  value={form.regionDescription}
                  onChange={(e) =>
                    setForm({ ...form, regionDescription: e.target.value })
                  }
                  placeholder="Denver, CO and surrounding 15-mile radius"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) =>
                      setForm({ ...form, latitude: e.target.value })
                    }
                    placeholder="39.7392"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) =>
                      setForm({ ...form, longitude: e.target.value })
                    }
                    placeholder="-104.9903"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Radius (miles)</Label>
                  <Input
                    type="number"
                    value={form.radiusMiles}
                    onChange={(e) =>
                      setForm({ ...form, radiusMiles: e.target.value })
                    }
                    placeholder="15"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zip Code</Label>
                  <Input
                    value={form.zipCode}
                    onChange={(e) =>
                      setForm({ ...form, zipCode: e.target.value })
                    }
                    placeholder="80202"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Zip Codes (comma-separated, optional)</Label>
                <Input
                  value={form.zipCodes}
                  onChange={(e) =>
                    setForm({ ...form, zipCodes: e.target.value })
                  }
                  placeholder="80202, 80203, 80204"
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Market" : "Create Market"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableRow key={market._id}>
                  <TableCell className="font-medium">
                    {market.name}
                  </TableCell>
                  <TableCell>{market.regionDescription}</TableCell>
                  <TableCell>{market.radiusMiles} mi</TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSheetMarketId(market._id)}
                      className="inline-flex"
                    >
                      {market.searchSources &&
                      market.searchSources.length > 0 ? (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                        >
                          <Globe className="mr-1 h-3 w-3" />
                          {market.searchSources.length} sources
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(market)}>
                          Edit
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

              {/* Source list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Event Sources
                    {sheetMarket.searchSources &&
                      sheetMarket.searchSources.length > 0 && (
                        <span className="ml-2 text-muted-foreground font-normal">
                          ({sheetMarket.searchSources.length})
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
                    <RefreshCw className="mr-2 h-3 w-3" />
                    AI Generate
                  </Button>
                </div>

                {sheetMarket.searchSources &&
                sheetMarket.searchSources.length > 0 ? (
                  <ul className="space-y-1">
                    {sheetMarket.searchSources.map((source) => (
                      <li
                        key={source}
                        className="group flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-xs">
                            {getSourceDomain(source)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {source}
                          </span>
                        </div>
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() =>
                            handleRemoveSource(sheetMarket._id, source)
                          }
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center">
                    <Globe className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No sources yet.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add URLs manually or click &quot;AI Generate&quot; to
                      auto-discover local event sources.
                    </p>
                  </div>
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
