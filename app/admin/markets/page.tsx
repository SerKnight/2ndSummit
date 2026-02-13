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
import { Plus, MoreHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";

export default function MarketsPage() {
  const markets = useQuery(api.markets.list);
  const createMarket = useMutation(api.markets.create);
  const updateMarket = useMutation(api.markets.update);
  const removeMarket = useMutation(api.markets.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"markets"> | null>(null);
  const [form, setForm] = useState({
    name: "",
    regionDescription: "",
    latitude: "",
    longitude: "",
    radiusMiles: "",
    zipCodes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      regionDescription: "",
      latitude: "",
      longitude: "",
      radiusMiles: "",
      zipCodes: "",
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
          ? form.zipCodes.split(",").map((z) => z.trim()).filter(Boolean)
          : undefined,
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
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.map((market) => (
                <TableRow key={market._id}>
                  <TableCell className="font-medium">{market.name}</TableCell>
                  <TableCell>{market.regionDescription}</TableCell>
                  <TableCell>{market.radiusMiles} mi</TableCell>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/discovery?market=${market._id}`}>
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
    </div>
  );
}
