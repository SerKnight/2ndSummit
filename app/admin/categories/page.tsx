"use client";

import { Fragment, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Leaf, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { pillarColors, PILLARS } from "@/lib/pillars";
import { Textarea } from "@/components/ui/textarea";

export default function CategoriesPage() {
  const categories = useQuery(api.eventCategories.list, {});
  const createCategory = useMutation(api.eventCategories.create);
  const updateCategory = useMutation(api.eventCategories.update);
  const removeCategory = useMutation(api.eventCategories.remove);
  const seedCategories = useMutation(api.eventCategories.seed);
  const regeneratePrompt = useMutation(api.eventCategories.regeneratePrompt);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"eventCategories"> | null>(null);
  const [form, setForm] = useState({
    name: "",
    pillar: "Move" as string,
    description: "",
    searchSubPrompt: "",
    exclusionRules: "",
  });
  const [activeTab, setActiveTab] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm({ name: "", pillar: "Move", description: "", searchSubPrompt: "", exclusionRules: "" });
    setEditingId(null);
  };

  const openEdit = (cat: NonNullable<typeof categories>[number]) => {
    setForm({
      name: cat.name,
      pillar: cat.pillar,
      description: cat.description || "",
      searchSubPrompt: cat.searchSubPrompt || "",
      exclusionRules: cat.exclusionRules || "",
    });
    setEditingId(cat._id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCategory({
          id: editingId,
          name: form.name,
          pillar: form.pillar,
          description: form.description || undefined,
          searchSubPrompt: form.searchSubPrompt || undefined,
          exclusionRules: form.exclusionRules || undefined,
        });
        toast.success("Category updated");
      } else {
        await createCategory({
          name: form.name,
          pillar: form.pillar,
          description: form.description || undefined,
          searchSubPrompt: form.searchSubPrompt || undefined,
          exclusionRules: form.exclusionRules || undefined,
        });
        toast.success("Category created");
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save category"
      );
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedCategories({});
      if (result.seeded) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch {
      toast.error("Failed to seed categories");
    }
  };

  const handleRegeneratePrompt = async (id: Id<"eventCategories">, name: string) => {
    try {
      setRegeneratingIds((prev) => new Set(prev).add(id));
      await regeneratePrompt({ id });
      toast.success(`Prompt regeneration scheduled for "${name}"`);
    } catch {
      toast.error("Failed to schedule prompt regeneration");
    } finally {
      setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filteredCategories =
    categories?.filter(
      (cat) => activeTab === "all" || cat.pillar === activeTab
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage experience categories across Move, Discover, Connect
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed}>
            <Leaf className="mr-2 h-4 w-4" />
            Seed Defaults
          </Button>
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
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Category" : "Add Category"}
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
                    placeholder="Hiking"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pillar</Label>
                  <Select
                    value={form.pillar}
                    onValueChange={(val) =>
                      setForm({ ...form, pillar: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Brief description of this category"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Search Sub-Prompt (optional)</Label>
                  <Textarea
                    value={form.searchSubPrompt}
                    onChange={(e) =>
                      setForm({ ...form, searchSubPrompt: e.target.value })
                    }
                    placeholder="Custom search prompt for event discovery. Leave blank to auto-generate."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    If left blank, a prompt will be auto-generated using AI.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Exclusion Rules (optional)</Label>
                  <Textarea
                    value={form.exclusionRules}
                    onChange={(e) =>
                      setForm({ ...form, exclusionRules: e.target.value })
                    }
                    placeholder="Rules for excluding certain events from this category"
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Update Category" : "Create Category"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {PILLARS.map((p) => (
            <TabsTrigger key={p} value={p}>
              {p}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {categories === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-md border p-8 text-center">
              <p className="text-muted-foreground">
                No categories yet. Seed defaults or create your first category.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Pillar</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((cat) => {
                    const isExpanded = expandedRows.has(cat._id);
                    const hasPrompt = !!cat.searchSubPrompt;
                    const hasExclusions = !!cat.exclusionRules;

                    return (
                      <Fragment key={cat._id}>
                        <TableRow>
                          <TableCell className="px-2">
                            {(hasPrompt || hasExclusions) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleRowExpanded(cat._id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={pillarColors[cat.pillar] || ""}
                            >
                              {cat.pillar}
                            </Badge>
                          </TableCell>
                          <TableCell>{cat.eventCount}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {hasPrompt ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Prompt ready
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                  No prompt
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Regenerate prompt"
                                disabled={regeneratingIds.has(cat._id)}
                                onClick={() => handleRegeneratePrompt(cat._id, cat.name)}
                              >
                                <RefreshCw
                                  className={`h-3.5 w-3.5 ${
                                    regeneratingIds.has(cat._id) ? "animate-spin" : ""
                                  }`}
                                />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                cat.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {cat.isActive ? "Active" : "Inactive"}
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
                                <DropdownMenuItem onClick={() => openEdit(cat)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRegeneratePrompt(cat._id, cat.name)}
                                >
                                  Regenerate Prompt
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    await updateCategory({
                                      id: cat._id,
                                      isActive: !cat.isActive,
                                    });
                                    toast.success(
                                      cat.isActive
                                        ? "Category deactivated"
                                        : "Category activated"
                                    );
                                  }}
                                >
                                  {cat.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={async () => {
                                    if (
                                      confirm("Delete this category?")
                                    ) {
                                      await removeCategory({ id: cat._id });
                                      toast.success("Category deleted");
                                    }
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${cat._id}-expanded`}>
                            <TableCell colSpan={7} className="bg-muted/30 px-6 py-3">
                              <div className="space-y-3">
                                {hasPrompt && (
                                  <div>
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                      Search Sub-Prompt
                                    </Label>
                                    <Textarea
                                      value={cat.searchSubPrompt || ""}
                                      readOnly
                                      rows={3}
                                      className="mt-1 bg-background text-sm resize-none cursor-default"
                                    />
                                  </div>
                                )}
                                {hasExclusions && (
                                  <div>
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                      Exclusion Rules
                                    </Label>
                                    <Textarea
                                      value={cat.exclusionRules || ""}
                                      readOnly
                                      rows={2}
                                      className="mt-1 bg-background text-sm resize-none cursor-default"
                                    />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
