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
import { ArrowLeft, Loader2, Globe } from "lucide-react";
import Link from "next/link";
import { runStatusColors, statusColors } from "@/lib/pillars";

export default function DiscoveryJobDetailPage() {
  const params = useParams();
  const jobId = params.id as Id<"eventDiscoveryJobs">;

  const job = useQuery(api.eventDiscoveryJobs.get, { id: jobId });
  const events = useQuery(api.events.listByJob, { discoveryJobId: jobId });
  const llmLogs = useQuery(api.llmLogs.list, { discoveryJobId: jobId });

  const [selectedLogId, setSelectedLogId] = useState<Id<"llmLogs"> | null>(
    null
  );
  const selectedLog = useQuery(
    api.llmLogs.get,
    selectedLogId ? { id: selectedLogId } : "skip"
  );

  if (job === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="space-y-4">
        <Link href="/admin/discovery">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Discovery
          </Button>
        </Link>
        <p className="text-muted-foreground">Discovery job not found.</p>
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

  const isRunning = ["pending", "searching", "validating", "storing"].includes(
    job.status
  );

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
                {job.marketName}
              </h1>
              <Badge
                variant="outline"
                className={runStatusColors[job.status] || ""}
              >
                {isRunning && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                {job.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {job.discoveryMethod === "crawl" ? (
                <>
                  <Badge
                    variant="outline"
                    className="mr-2 bg-emerald-100 text-emerald-800 border-emerald-300"
                  >
                    <Globe className="mr-1 h-3 w-3" />
                    Crawl
                  </Badge>
                  {job.sourceName || job.sourceUrl || "Unknown source"}
                </>
              ) : (
                job.categoryName
              )}
              {" · "}
              Started {new Date(job.startedAt).toLocaleString()}
              {" · "}
              {formatDuration(job.startedAt, job.completedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {job.errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Error
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {job.errorMessage}
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
          {job.rawResponse && (
            <TabsTrigger value="raw">Raw Response</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Configuration</CardTitle>
              <CardDescription>
                Parameters used for this event discovery job
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Market
                    </Label>
                    <p className="text-sm font-medium">{job.marketName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {job.discoveryMethod === "crawl" ? "Source" : "Category"}
                    </Label>
                    <p className="text-sm font-medium">
                      {job.discoveryMethod === "crawl"
                        ? job.sourceName || job.sourceUrl || "—"
                        : job.categoryName}
                    </p>
                  </div>
                  {job.discoveryMethod === "crawl" && job.sourceUrl && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Source URL
                      </Label>
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-medium text-blue-600 hover:underline truncate"
                      >
                        {job.sourceUrl}
                      </a>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Date Range
                    </Label>
                    <p className="text-sm font-medium">
                      {job.dateRangeStart ?? "—"} to {job.dateRangeEnd ?? "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Events Found
                    </Label>
                    <p className="text-sm font-medium">{job.eventsFound}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Events Validated
                    </Label>
                    <p className="text-sm font-medium">
                      {job.eventsValidated ?? "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Events Stored
                    </Label>
                    <p className="text-sm font-medium">
                      {job.eventsStored ?? "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Duration
                    </Label>
                    <p className="text-sm font-medium">
                      {formatDuration(job.startedAt, job.completedAt)}
                    </p>
                  </div>
                </div>

                {/* Prompt Used */}
                {job.promptUsed && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Prompt Used
                    </Label>
                    <pre className="mt-1 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                      {job.promptUsed}
                    </pre>
                  </div>
                )}
              </div>
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
                  ? `${events.length} events discovered in this job`
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
                  {isRunning
                    ? "Events will appear here as they are discovered..."
                    : "No events were found in this job."}
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
                        <TableHead>Confidence</TableHead>
                        <TableHead>Duplicate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event._id}>
                          <TableCell className="max-w-[250px] font-medium">
                            <div className="truncate">{event.title}</div>
                            {event.briefSummary && (
                              <div className="truncate text-xs text-muted-foreground">
                                {event.briefSummary}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {event.dateStart || event.dateRaw || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate text-sm">
                              {event.locationName || "—"}
                            </div>
                            {event.locationCity && (
                              <div className="truncate text-xs text-muted-foreground">
                                {event.locationCity}
                                {event.locationState &&
                                  `, ${event.locationState}`}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                statusColors[event.validationStatus] || ""
                              }
                            >
                              {event.validationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {event.validationConfidence != null
                              ? `${Math.round(event.validationConfidence * 100)}%`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {event.isDuplicate && (
                              <Badge
                                variant="outline"
                                className="bg-yellow-100 text-yellow-800 border-yellow-300"
                              >
                                Dup
                              </Badge>
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
                Every API call made during this discovery job
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
                  {isRunning
                    ? "Logs will appear here as API calls are made..."
                    : "No API calls were logged for this job."}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Action</TableHead>
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
                          <TableCell className="capitalize">
                            {log.action}
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

        {/* Raw Response Tab */}
        {job.rawResponse && (
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw API Response</CardTitle>
                <CardDescription>
                  Unprocessed text returned by Perplexity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[600px] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                  {job.rawResponse}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        )}
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
