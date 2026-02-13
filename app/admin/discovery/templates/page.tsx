"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { PROMPT_VARIABLES } from "@/lib/promptVariables";

type TemplateFormState = {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
};

const emptyForm: TemplateFormState = {
  name: "",
  description: "",
  systemPrompt: "",
  userPromptTemplate: "",
};

export default function PromptTemplatesPage() {
  const templates = useQuery(api.promptTemplates.list);
  const createTemplate = useMutation(api.promptTemplates.create);
  const updateTemplate = useMutation(api.promptTemplates.update);
  const removeTemplate = useMutation(api.promptTemplates.remove);
  const setDefault = useMutation(api.promptTemplates.setDefault);
  const seedTemplates = useMutation(api.promptTemplates.seed);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"promptTemplates"> | null>(
    null
  );
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (template: {
    _id: Id<"promptTemplates">;
    name: string;
    description?: string;
    systemPrompt: string;
    userPromptTemplate: string;
  }) => {
    setEditingId(template._id);
    setForm({
      name: template.name,
      description: template.description ?? "",
      systemPrompt: template.systemPrompt,
      userPromptTemplate: template.userPromptTemplate,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!form.systemPrompt.trim()) {
      toast.error("System prompt is required");
      return;
    }
    if (!form.userPromptTemplate.trim()) {
      toast.error("User prompt template is required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateTemplate({
          id: editingId,
          name: form.name,
          description: form.description || undefined,
          systemPrompt: form.systemPrompt,
          userPromptTemplate: form.userPromptTemplate,
        });
        toast.success("Template updated");
      } else {
        await createTemplate({
          name: form.name,
          description: form.description || undefined,
          systemPrompt: form.systemPrompt,
          userPromptTemplate: form.userPromptTemplate,
          isDefault: !templates || templates.length === 0,
        });
        toast.success("Template created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"promptTemplates">) => {
    try {
      await removeTemplate({ id });
      toast.success("Template deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete template"
      );
    }
  };

  const handleSetDefault = async (id: Id<"promptTemplates">) => {
    try {
      await setDefault({ id });
      toast.success("Default template updated");
    } catch (error) {
      toast.error("Failed to set default");
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedTemplates();
      if (result.seeded) {
        toast.success("Default template created");
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/discovery">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Prompt Templates
            </h1>
            <p className="text-muted-foreground">
              Manage the AI prompts used for event discovery
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Empty State / Seed */}
      {templates && templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              No prompt templates yet. Seed the default template to get started
              with the standard discovery prompt.
            </p>
            <Button onClick={handleSeed}>Create Default Template</Button>
          </CardContent>
        </Card>
      )}

      {/* Templates Table */}
      {templates === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : templates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Click a template to edit its prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tmpl) => (
                    <TableRow
                      key={tmpl._id}
                      className="cursor-pointer"
                      onClick={() => openEdit(tmpl)}
                    >
                      <TableCell className="font-medium">
                        {tmpl.name}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {tmpl.description || "—"}
                      </TableCell>
                      <TableCell>
                        {tmpl.isDefault && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-300"
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(tmpl.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!tmpl.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSetDefault(tmpl._id)}
                              title="Set as default"
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(tmpl._id)}
                            title="Delete template"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Default Discovery"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, systemPrompt: e.target.value }))
                }
                placeholder="Instructions for the AI..."
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>User Prompt Template</Label>
              <Textarea
                value={form.userPromptTemplate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    userPromptTemplate: e.target.value,
                  }))
                }
                placeholder="Search for upcoming {{categoryNames}} events..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <Separator />

            {/* Variables Reference */}
            <div>
              <Label className="text-xs text-muted-foreground">
                Available Variables
              </Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Use these in your user prompt template with double curly braces
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PROMPT_VARIABLES.map((v) => (
                  <div
                    key={v.name}
                    className="rounded-md bg-muted px-3 py-2 text-xs"
                  >
                    <code className="font-semibold text-primary">
                      {`{{${v.name}}}`}
                    </code>
                    <span className="ml-2 text-muted-foreground">
                      {v.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
