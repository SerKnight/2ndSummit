"use client";

import { useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  CheckCircle,
  XCircle,
  Copy,
  Calendar,
  MapPin,
} from "lucide-react";
import { pillarColors, statusColors, PILLARS } from "@/lib/pillars";

// ---------------------------------------------------------------------------
// Kanban column config
// ---------------------------------------------------------------------------
const KANBAN_COLUMNS = [
  {
    key: "pending" as const,
    label: "Pending",
    borderColor: "border-gray-400",
    bgHeader: "bg-gray-500/10",
  },
  {
    key: "needs_review" as const,
    label: "Needs Review",
    borderColor: "border-yellow-400",
    bgHeader: "bg-yellow-500/10",
  },
  {
    key: "validated" as const,
    label: "Approved",
    borderColor: "border-green-400",
    bgHeader: "bg-green-500/10",
  },
  {
    key: "rejected" as const,
    label: "Rejected",
    borderColor: "border-red-400",
    bgHeader: "bg-red-500/10",
  },
] as const;

type ColumnKey = (typeof KANBAN_COLUMNS)[number]["key"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventRow = any; // row shape from api.events.list

// ---------------------------------------------------------------------------
// EventCard
// ---------------------------------------------------------------------------
function EventCard({
  event,
  compact,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onClick,
  columnKey,
}: {
  event: EventRow;
  compact?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClick: () => void;
  columnKey: ColumnKey;
}) {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
      >
        <p className="truncate text-sm font-medium">{event.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {event.dateStart || event.dateRaw || "No date"}
          {event.locationName ? `  ·  ${event.locationName}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
    >
      {/* Row 1: checkbox + title + pillar */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 rounded"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {event.title}
        </span>
        {event.pillar && (
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${pillarColors[event.pillar] || ""}`}
          >
            {event.pillar}
          </Badge>
        )}
      </div>

      {/* Row 2: date */}
      {(event.dateStart || event.dateRaw) && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {event.dateStart
              ? new Date(event.dateStart + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )
              : event.dateRaw}
          </span>
        </div>
      )}

      {/* Row 3: location */}
      {event.locationName && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.locationName}</span>
        </div>
      )}

      {/* Row 4: confidence + dup flag */}
      <div className="mt-2 flex items-center gap-2 border-t pt-2">
        {event.validationConfidence != null && (
          <span className="text-xs text-muted-foreground">
            {Math.round(event.validationConfidence * 100)}% confidence
          </span>
        )}
        {event.isDuplicate && (
          <Badge
            variant="outline"
            className="bg-orange-100 text-orange-800 border-orange-300 text-[10px]"
          >
            <Copy className="mr-0.5 h-3 w-3" />
            Dup
          </Badge>
        )}
        <div className="flex-1" />

        {/* Inline actions */}
        {columnKey !== "rejected" && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {columnKey !== "validated" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={onApprove}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Approve
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={onReject}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------
function KanbanColumn({
  label,
  borderColor,
  bgHeader,
  events,
  columnKey,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onApprove,
  onReject,
  onClickCard,
}: {
  label: string;
  borderColor: string;
  bgHeader: string;
  events: EventRow[];
  columnKey: ColumnKey;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[], allSelected: boolean) => void;
  onApprove: (id: Id<"events">) => void;
  onReject: (id: Id<"events">) => void;
  onClickCard: (id: Id<"events">) => void;
}) {
  const isRejected = columnKey === "rejected";
  const columnIds = events.map((e) => e._id as string);
  const allSelected = columnIds.length > 0 && columnIds.every((id) => selectedIds.has(id));
  const someSelected = columnIds.some((id) => selectedIds.has(id));

  return (
    <div
      className={`flex shrink-0 flex-col rounded-lg border bg-muted/30 ${
        isRejected ? "min-w-[220px]" : "min-w-[300px]"
      } flex-1`}
    >
      {/* Column header */}
      <div
        className={`flex items-center gap-2 rounded-t-lg border-b-2 ${borderColor} ${bgHeader} px-3 py-2`}
      >
        {columnIds.length > 0 && (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={() => onToggleSelectAll(columnIds, allSelected)}
            className="rounded"
          />
        )}
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="text-xs">
          {events.length}
        </Badge>
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {events.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            compact={isRejected}
            selected={selectedIds.has(event._id)}
            onToggleSelect={() => onToggleSelect(event._id)}
            onApprove={() => onApprove(event._id)}
            onReject={() => onReject(event._id)}
            onClick={() => onClickCard(event._id)}
            columnKey={columnKey}
          />
        ))}
        {events.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No events
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EventsPage() {
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<Id<"events"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const markets = useQuery(api.markets.list);
  const categories = useQuery(api.eventCategories.list, {});
  const events = useQuery(api.events.list, {
    marketId:
      marketFilter !== "all"
        ? (marketFilter as Id<"markets">)
        : undefined,
    pillar: pillarFilter !== "all" ? pillarFilter : undefined,
  });
  const eventDetail = useQuery(
    api.events.get,
    detailId ? { id: detailId } : "skip"
  );

  const approveEvent = useMutation(api.events.approve);
  const rejectEvent = useMutation(api.events.reject);
  const bulkUpdateStatus = useMutation(api.events.bulkUpdateStatus);
  const createEvent = useMutation(api.events.create);

  // Group events by validationStatus
  const columns = useMemo(() => {
    if (!events) return null;
    const grouped: Record<ColumnKey, EventRow[]> = {
      pending: [],
      needs_review: [],
      validated: [],
      rejected: [],
    };
    for (const event of events) {
      const bucket = grouped[event.validationStatus as ColumnKey];
      if (bucket) bucket.push(event);
    }
    return grouped;
  }, [events]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    marketId: "" as string,
    categoryId: "" as string,
    pillar: "" as string,
    dateRaw: "",
    dateStart: "",
    timeStart: "",
    timeEnd: "",
    locationName: "",
    locationAddress: "",
    costRaw: "",
    costType: "",
    difficultyLevel: "",
    tags: "",
    sourceUrl: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEvent({
        title: form.title,
        description: form.description,
        marketId: form.marketId as Id<"markets">,
        categoryId: form.categoryId
          ? (form.categoryId as Id<"eventCategories">)
          : undefined,
        pillar: form.pillar || undefined,
        dateRaw: form.dateRaw || undefined,
        dateStart: form.dateStart || undefined,
        timeStart: form.timeStart || undefined,
        timeEnd: form.timeEnd || undefined,
        locationName: form.locationName || undefined,
        locationAddress: form.locationAddress || undefined,
        costRaw: form.costRaw || undefined,
        costType: form.costType || undefined,
        difficultyLevel: form.difficultyLevel || undefined,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        sourceUrl: form.sourceUrl || undefined,
      });
      toast.success("Event created");
      setCreateOpen(false);
      setForm({
        title: "",
        description: "",
        marketId: "",
        categoryId: "",
        pillar: "",
        dateRaw: "",
        dateStart: "",
        timeStart: "",
        timeEnd: "",
        locationName: "",
        locationAddress: "",
        costRaw: "",
        costType: "",
        difficultyLevel: "",
        tags: "",
        sourceUrl: "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create event"
      );
    }
  };

  const handleBulkAction = async (validationStatus: string) => {
    const ids = Array.from(selectedIds) as Id<"events">[];
    if (ids.length === 0) return;
    try {
      await bulkUpdateStatus({ ids, validationStatus });
      toast.success(`${ids.length} events updated to ${validationStatus}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk update failed");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (ids: string[], allSelected: boolean) => {
    const next = new Set(selectedIds);
    if (allSelected) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    setSelectedIds(next);
  };

  const handleApprove = (id: Id<"events">) => {
    approveEvent({ id });
    toast.success("Event approved");
  };

  const handleReject = (id: Id<"events">) => {
    rejectEvent({ id });
    toast.success("Event rejected");
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage discovered and curated events
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Market</Label>
                <Select
                  value={form.marketId}
                  onValueChange={(val) =>
                    setForm({ ...form, marketId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets?.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pillar</Label>
                  <Select
                    value={form.pillar}
                    onValueChange={(val) =>
                      setForm({ ...form, pillar: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PILLARS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(val) =>
                      setForm({ ...form, categoryId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.dateStart}
                    onChange={(e) =>
                      setForm({ ...form, dateStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={form.timeStart}
                    onChange={(e) =>
                      setForm({ ...form, timeStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={form.timeEnd}
                    onChange={(e) =>
                      setForm({ ...form, timeEnd: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input
                  value={form.locationName}
                  onChange={(e) =>
                    setForm({ ...form, locationName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Location Address</Label>
                <Input
                  value={form.locationAddress}
                  onChange={(e) =>
                    setForm({ ...form, locationAddress: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost</Label>
                  <Input
                    value={form.costRaw}
                    onChange={(e) =>
                      setForm({ ...form, costRaw: e.target.value })
                    }
                    placeholder="Free / $20 / etc"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost Type</Label>
                  <Select
                    value={form.costType}
                    onValueChange={(val) =>
                      setForm({ ...form, costType: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="donation">Donation</SelectItem>
                      <SelectItem value="varies">Varies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={form.difficultyLevel}
                  onValueChange={(val) =>
                    setForm({ ...form, difficultyLevel: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Challenging">Challenging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) =>
                    setForm({ ...form, tags: e.target.value })
                  }
                  placeholder="outdoor, social, fitness"
                />
              </div>
              <div className="space-y-2">
                <Label>Source URL</Label>
                <Input
                  value={form.sourceUrl}
                  onChange={(e) =>
                    setForm({ ...form, sourceUrl: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                Create Event
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={marketFilter} onValueChange={setMarketFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {markets?.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {PILLARS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction("validated")}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction("rejected")}
          >
            <XCircle className="mr-1 h-4 w-4" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      {events === undefined ? (
        <div className="flex flex-1 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 gap-3 overflow-x-auto"
          style={{ height: "calc(100vh - 13rem)" }}
        >
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              label={col.label}
              borderColor={col.borderColor}
              bgHeader={col.bgHeader}
              events={columns?.[col.key] ?? []}
              columnKey={col.key}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onApprove={handleApprove}
              onReject={handleReject}
              onClickCard={setDetailId}
            />
          ))}
        </div>
      )}

      {/* Event Detail Drawer */}
      <Sheet
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{eventDetail?.title || "Event Detail"}</SheetTitle>
          </SheetHeader>
          {eventDetail && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={
                    statusColors[eventDetail.validationStatus] || ""
                  }
                >
                  {eventDetail.validationStatus}
                </Badge>
                {eventDetail.pillar && (
                  <Badge
                    variant="outline"
                    className={pillarColors[eventDetail.pillar] || ""}
                  >
                    {eventDetail.pillar}
                  </Badge>
                )}
                {eventDetail.isDuplicate && (
                  <Badge
                    variant="outline"
                    className="bg-orange-100 text-orange-800 border-orange-300"
                  >
                    Potential Duplicate
                  </Badge>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Description
                </Label>
                <p className="text-sm">{eventDetail.description}</p>
              </div>

              {eventDetail.briefSummary && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Brief Summary
                  </Label>
                  <p className="text-sm">{eventDetail.briefSummary}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Market
                  </Label>
                  <p className="text-sm">{eventDetail.marketName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Category
                  </Label>
                  <p className="text-sm">{eventDetail.categoryName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">
                    {eventDetail.dateStart || eventDetail.dateRaw || "—"}
                  </p>
                  {eventDetail.dateEnd && (
                    <p className="text-xs text-muted-foreground">
                      to {eventDetail.dateEnd}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <p className="text-sm">
                    {eventDetail.timeStart || "—"}
                    {eventDetail.timeEnd ? ` – ${eventDetail.timeEnd}` : ""}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Location
                  </Label>
                  <p className="text-sm">
                    {eventDetail.locationName || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventDetail.locationAddress || ""}
                  </p>
                  {(eventDetail.locationCity || eventDetail.locationState) && (
                    <p className="text-xs text-muted-foreground">
                      {[eventDetail.locationCity, eventDetail.locationState]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Cost
                  </Label>
                  <p className="text-sm">{eventDetail.costRaw || "—"}</p>
                  {eventDetail.costType && (
                    <p className="text-xs text-muted-foreground">
                      Type: {eventDetail.costType}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Difficulty
                  </Label>
                  <p className="text-sm">
                    {eventDetail.difficultyLevel || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Validation Confidence
                  </Label>
                  <p className="text-sm">
                    {eventDetail.validationConfidence
                      ? `${Math.round(eventDetail.validationConfidence * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {eventDetail.isRecurring && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Recurring
                  </Label>
                  <p className="text-sm">
                    {eventDetail.recurrencePattern || "Yes (pattern unknown)"}
                  </p>
                </div>
              )}

              {eventDetail.tags && eventDetail.tags.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {eventDetail.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {eventDetail.validationNotes && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Validation Notes
                  </Label>
                  <p className="text-sm">{eventDetail.validationNotes}</p>
                </div>
              )}

              {eventDetail.originalPayload && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Original Discovery Data
                  </Label>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {eventDetail.originalPayload}
                  </pre>
                </div>
              )}

              {eventDetail.sourceUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Source
                  </Label>
                  <a
                    href={eventDetail.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {eventDetail.sourceDomain || eventDetail.sourceUrl}
                  </a>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    approveEvent({ id: eventDetail._id });
                    toast.success("Event approved");
                  }}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    rejectEvent({ id: eventDetail._id });
                    toast.success("Event rejected");
                  }}
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
