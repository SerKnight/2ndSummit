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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Wand2,
} from "lucide-react";
import { pillarColors, statusColors, PILLARS } from "@/lib/pillars";

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<Id<"events"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const markets = useQuery(api.markets.list);
  const categories = useQuery(api.categories.list, {});
  const events = useQuery(api.events.list, {
    marketId:
      marketFilter !== "all"
        ? (marketFilter as Id<"markets">)
        : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
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
  const updateEvent = useMutation(api.events.update);
  const triggerClassification = useMutation(api.classify.triggerClassification);

  const [form, setForm] = useState({
    title: "",
    description: "",
    marketId: "" as string,
    categoryId: "" as string,
    pillar: "" as string,
    date: "",
    startTime: "",
    endTime: "",
    locationName: "",
    locationAddress: "",
    price: "",
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
          ? (form.categoryId as Id<"categories">)
          : undefined,
        pillar: form.pillar || undefined,
        date: form.date || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        locationName: form.locationName || undefined,
        locationAddress: form.locationAddress || undefined,
        price: form.price || undefined,
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
        date: "",
        startTime: "",
        endTime: "",
        locationName: "",
        locationAddress: "",
        price: "",
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

  const handleBulkAction = async (status: string) => {
    const ids = Array.from(selectedIds) as Id<"events">[];
    if (ids.length === 0) return;
    try {
      await bulkUpdateStatus({ ids, status });
      toast.success(`${ids.length} events updated to ${status}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Bulk update failed");
    }
  };

  const handleClassify = async () => {
    try {
      await triggerClassification({
        marketId:
          marketFilter !== "all"
            ? (marketFilter as Id<"markets">)
            : undefined,
      });
      toast.success(
        "Classification started — uncategorized events will update in real-time"
      );
    } catch (error) {
      toast.error("Failed to start classification");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (!events) return;
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e._id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage discovered and curated events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClassify}>
            <Wand2 className="mr-2 h-4 w-4" />
            Classify Uncategorized
          </Button>
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
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({ ...form, startTime: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm({ ...form, endTime: e.target.value })
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
                    <Label>Price</Label>
                    <Input
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      placeholder="Free / $20 / etc"
                    />
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
            onClick={() => handleBulkAction("approved")}
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

      {/* Status Tabs + Table */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
          <TabsTrigger value="classified">Classified</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {events === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-md border p-8 text-center">
              <p className="text-muted-foreground">
                No events found. Run a discovery or create events manually.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === events.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Pillar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event._id}
                      className="cursor-pointer"
                      onClick={() => setDetailId(event._id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(event._id)}
                          onChange={() => toggleSelect(event._id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {event.title}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {event.date || "—"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {event.locationName || "—"}
                      </TableCell>
                      <TableCell>{event.categoryName}</TableCell>
                      <TableCell>
                        {event.pillar && (
                          <Badge
                            variant="outline"
                            className={pillarColors[event.pillar] || ""}
                          >
                            {event.pillar}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[event.status] || ""}
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.classificationConfidence
                          ? `${Math.round(event.classificationConfidence * 100)}%`
                          : "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                approveEvent({ id: event._id });
                                toast.success("Event approved");
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                rejectEvent({ id: event._id });
                                toast.success("Event rejected");
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                            {event.sourceUrl && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(event.sourceUrl!, "_blank")
                                }
                              >
                                View Source
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Event Detail Drawer */}
      <Sheet open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{eventDetail?.title || "Event Detail"}</SheetTitle>
          </SheetHeader>
          {eventDetail && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={statusColors[eventDetail.status] || ""}
                >
                  {eventDetail.status}
                </Badge>
                {eventDetail.pillar && (
                  <Badge
                    variant="outline"
                    className={pillarColors[eventDetail.pillar] || ""}
                  >
                    {eventDetail.pillar}
                  </Badge>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Description
                </Label>
                <p className="text-sm">{eventDetail.description}</p>
              </div>

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
                  <p className="text-sm">{eventDetail.date || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <p className="text-sm">
                    {eventDetail.startTime || "—"}
                    {eventDetail.endTime ? ` – ${eventDetail.endTime}` : ""}
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
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Price
                  </Label>
                  <p className="text-sm">{eventDetail.price || "—"}</p>
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
                    Confidence
                  </Label>
                  <p className="text-sm">
                    {eventDetail.classificationConfidence
                      ? `${Math.round(eventDetail.classificationConfidence * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {eventDetail.tags && eventDetail.tags.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {eventDetail.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {eventDetail.classificationNotes && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Classification Notes
                  </Label>
                  <p className="text-sm">{eventDetail.classificationNotes}</p>
                </div>
              )}

              {eventDetail.rawData && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Raw Discovery Data
                  </Label>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {eventDetail.rawData}
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
                    {eventDetail.sourceUrl}
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
