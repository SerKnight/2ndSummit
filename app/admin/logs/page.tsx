"use client";

import { useState, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { ScrollText, Loader2 } from "lucide-react";

const actionTabs = [
  { value: "all", label: "All" },
  { value: "discovery", label: "Discovery" },
  { value: "validation", label: "Validation" },
  { value: "crawl_extraction", label: "Crawl" },
  { value: "market_sources", label: "Market Sources" },
  { value: "category_prompt", label: "Category Prompt" },
] as const;

const providerTabs = [
  { value: "all", label: "All Providers" },
  { value: "openai", label: "OpenAI" },
  { value: "perplexity", label: "Perplexity" },
] as const;

const timeTabs = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
] as const;

function computeSince(timeFilter: string): number | undefined {
  const now = new Date();
  switch (timeFilter) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.getTime();
    }
    case "7d":
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    default:
      return undefined;
  }
}

const PAGE_SIZE = 50;

export default function LogsPage() {
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("7d");
  const [selectedLogId, setSelectedLogId] = useState<Id<"llmLogs"> | null>(
    null
  );

  const since = useMemo(() => computeSince(timeFilter), [timeFilter]);

  const queryArgs = useMemo(() => {
    const args: {
      provider?: string;
      action?: string;
      since?: number;
    } = {};
    if (providerFilter !== "all") args.provider = providerFilter;
    if (actionFilter !== "all") args.action = actionFilter;
    if (since) args.since = since;
    return args;
  }, [providerFilter, actionFilter, since]);

  const { results: logs, status, loadMore } = usePaginatedQuery(
    api.llmLogs.listPaginated,
    queryArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const selectedLog = useQuery(
    api.llmLogs.get,
    selectedLogId ? { id: selectedLogId } : "skip"
  );

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPrompt = (prompt: string) => {
    try {
      const parsed = JSON.parse(prompt);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return prompt;
    }
  };

  const formatResponse = (response: string) => {
    try {
      const parsed = JSON.parse(response);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground">
          Audit log of all LLM API calls — prompts, responses, and metadata
        </p>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            API Call Logs
          </CardTitle>
          <CardDescription>
            {logs ? `${logs.length} log entries loaded` : "Loading..."}
            {status === "CanLoadMore" && " (more available)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter tabs row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* Time filter tabs */}
            <div className="flex items-center gap-1">
              {timeTabs.map((tab) => (
                <Button
                  key={tab.value}
                  variant={timeFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTimeFilter(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Action tabs */}
            <div className="flex items-center gap-1 border-l pl-4">
              {actionTabs.map((tab) => (
                <Button
                  key={tab.value}
                  variant={actionFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActionFilter(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Provider tabs */}
            <div className="flex items-center gap-1 border-l pl-4">
              {providerTabs.map((tab) => (
                <Button
                  key={tab.value}
                  variant={providerFilter === tab.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setProviderFilter(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {status === "LoadingFirstPage" ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No LLM logs found for the selected filters.
            </p>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log._id}
                        className="cursor-pointer"
                        onClick={() => setSelectedLogId(log._id)}
                      >
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString()}
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
                          {log.action.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "success" ? "default" : "destructive"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDuration(log.durationMs)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {log.tokensUsed ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {status === "CanLoadMore" && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => loadMore(PAGE_SIZE)}
                  >
                    Load More
                  </Button>
                </div>
              )}
              {status === "LoadingMore" && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedLogId}
        onOpenChange={(open) => !open && setSelectedLogId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Log Detail</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* Metadata Grid */}
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
                    Action
                  </Label>
                  <p className="text-sm capitalize">{selectedLog.action.replace(/_/g, " ")}</p>
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
                  <p className="text-sm tabular-nums">
                    {formatDuration(selectedLog.durationMs)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Tokens Used
                  </Label>
                  <p className="text-sm tabular-nums">
                    {selectedLog.tokensUsed ?? "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Timestamp
                  </Label>
                  <p className="text-sm">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedLog.marketId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Market ID
                    </Label>
                    <p className="break-all font-mono text-xs">
                      {selectedLog.marketId}
                    </p>
                  </div>
                )}
                {selectedLog.discoveryJobId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Discovery Job ID
                    </Label>
                    <p className="break-all font-mono text-xs">
                      {selectedLog.discoveryJobId}
                    </p>
                  </div>
                )}
                {selectedLog.eventId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Event ID
                    </Label>
                    <p className="break-all font-mono text-xs">
                      {selectedLog.eventId}
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-xs text-red-600">Error Message</Label>
                  <pre className="mt-1 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}

              {/* Prompt */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Prompt (messages sent)
                </Label>
                <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {formatPrompt(selectedLog.prompt)}
                </pre>
              </div>

              {/* Response */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Response (raw)
                </Label>
                <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {formatResponse(selectedLog.response)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
