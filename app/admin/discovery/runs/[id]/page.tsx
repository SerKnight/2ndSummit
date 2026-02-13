"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { runStatusColors, pillarColors, statusColors } from "@/lib/pillars";

export default function DiscoveryRunDetailPage() {
  const params = useParams();
  const runId = params.id as Id<"discoveryRuns">;

  const run = useQuery(api.discoveryRuns.get, { id: runId });
  const events = useQuery(api.events.listByRun, { discoveryRunId: runId });
  const llmLogs = useQuery(api.llmLogs.list, { discoveryRunId: runId });

  const [selectedLogId, setSelectedLogId] = useState<Id<"llmLogs"> | null>(
    null
  );
  const selectedLog = useQuery(
    api.llmLogs.get,
    selectedLogId ? { id: selectedLogId } : "skip"
  );

  if (run === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (run === null) {
    return (
      <div className="space-y-4">
        <Link href="/admin/discovery">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discovery
          </Button>
        </Link>
        <p className="text-muted-foreground">Discovery run not found.</p>
      </div>
    );
  }

  const formatDuration = (start: number, end?: number) => {
    if (!end) return "In progress...";
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const config = run.config;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/discovery">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {run.marketName}
              </h1>
              <Badge
                variant="outline"
                className={runStatusColors[run.status] || ""}
              >
                {run.status === "running" && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                {run.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Started {new Date(run.startedAt).toLocaleString()}
              {" · "}
              {formatDuration(run.startedAt, run.completedAt)}
              {" · "}
              {run.eventsFound} events found
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {run.errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Error
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {run.errorMessage}
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">
            Events{events ? ` (${events.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="logs">
            LLM Logs{llmLogs ? ` (${llmLogs.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="raw">
            Raw Responses
            {run.rawResponses ? ` (${run.rawResponses.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Run Configuration</CardTitle>
              <CardDescription>
                Parameters used for this discovery run
              </CardDescription>
            </CardHeader>
            <CardContent>
              {config ? (
                <div className="space-y-6">
                  {/* Parameters Grid */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Time Range
                      </Label>
                      <p className="text-sm font-medium">
                        {config.timeRangeDays} days
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Radius
                      </Label>
                      <p className="text-sm font-medium">
                        {config.radiusMiles} miles
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Batch Size
                      </Label>
                      <p className="text-sm font-medium">{config.batchSize}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Temperature
                      </Label>
                      <p className="text-sm font-medium">
                        {config.temperature}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Model
                      </Label>
                      <p className="font-mono text-sm">{config.model}</p>
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Categories Searched ({run.categoriesSearched.length})
                    </Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {run.categoriesSearched.map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Prompts */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      System Prompt
                    </Label>
                    <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                      {config.systemPromptUsed}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      User Prompt Template
                    </Label>
                    <pre className="mt-1 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                      {config.userPromptTemplateUsed}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This run used default settings (no configuration snapshot
                    available).
                  </p>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Categories Searched
                    </Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {run.categoriesSearched.map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Events Found</CardTitle>
              <CardDescription>
                {events
                  ? `${events.length} events discovered in this run`
                  : "Loading events..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events === undefined ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {run.status === "running"
                    ? "Events will appear here as they are discovered..."
                    : "No events were found in this run."}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event._id}>
                          <TableCell className="max-w-[250px] font-medium">
                            <div className="truncate">{event.title}</div>
                            {event.description && (
                              <div className="truncate text-xs text-muted-foreground">
                                {event.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {event.date || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate text-sm">
                              {event.locationName || "—"}
                            </div>
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
                            {event.pillar ? (
                              <Badge
                                variant="outline"
                                className={pillarColors[event.pillar] || ""}
                              >
                                {event.categoryName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {event.categoryName}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>LLM API Calls</CardTitle>
              <CardDescription>
                Every API call made during this discovery run
              </CardDescription>
            </CardHeader>
            <CardContent>
              {llmLogs === undefined ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : llmLogs.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {run.status === "running"
                    ? "Logs will appear here as API calls are made..."
                    : "No API calls were logged for this run."}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Tokens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {llmLogs.map((log) => (
                        <TableRow
                          key={log._id}
                          className="cursor-pointer"
                          onClick={() => setSelectedLogId(log._id)}
                        >
                          <TableCell className="text-sm">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {log.provider}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.model}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.status === "success"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatMs(log.durationMs)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {log.tokensUsed ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Responses Tab */}
        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw API Responses</CardTitle>
              <CardDescription>
                Unprocessed text returned by Perplexity for each batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {run.rawResponses && run.rawResponses.length > 0 ? (
                <div className="space-y-4">
                  {run.rawResponses.map((resp, i) => (
                    <details key={i} className="group">
                      <summary className="cursor-pointer rounded-md bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/80">
                        Batch {i + 1}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {resp.length.toLocaleString()} characters
                        </span>
                      </summary>
                      <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                        {resp}
                      </pre>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  {run.status === "running"
                    ? "Responses will appear here as batches complete..."
                    : "No raw responses recorded."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Sheet */}
      <Sheet
        open={!!selectedLogId}
        onOpenChange={(open) => !open && setSelectedLogId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>API Call Detail</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Provider
                  </Label>
                  <p className="text-sm font-medium capitalize">
                    {selectedLog.provider}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Model
                  </Label>
                  <p className="font-mono text-sm">{selectedLog.model}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        selectedLog.status === "success"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {selectedLog.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Duration
                  </Label>
                  <p className="text-sm">{formatMs(selectedLog.durationMs)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Tokens
                  </Label>
                  <p className="text-sm">{selectedLog.tokensUsed ?? "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Timestamp
                  </Label>
                  <p className="text-sm">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-xs text-red-600">Error</Label>
                  <pre className="mt-1 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">
                  Prompt (messages sent)
                </Label>
                <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {formatJson(selectedLog.prompt)}
                </pre>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Response (raw)
                </Label>
                <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {formatJson(selectedLog.response)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
