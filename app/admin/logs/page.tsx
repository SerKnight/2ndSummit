"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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
import { ScrollText } from "lucide-react";

export default function LogsPage() {
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedLogId, setSelectedLogId] = useState<Id<"llmLogs"> | null>(
    null
  );

  const queryArgs: {
    provider?: string;
    action?: string;
  } = {};
  if (providerFilter !== "all") queryArgs.provider = providerFilter;
  if (actionFilter !== "all") queryArgs.action = actionFilter;

  const logs = useQuery(api.llmLogs.list, queryArgs);
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
        <h1 className="text-3xl font-bold tracking-tight">LLM Logs</h1>
        <p className="text-muted-foreground">
          Audit log of all LLM API calls — prompts, responses, and metadata
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="discovery">Discovery</SelectItem>
                  <SelectItem value="classification">Classification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            API Call Logs
          </CardTitle>
          <CardDescription>
            {logs ? `${logs.length} log entries` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No LLM logs yet. Run a discovery or classification to see API
              calls logged here.
            </p>
          ) : (
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
                        {log.action}
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
                  <p className="text-sm capitalize">{selectedLog.action}</p>
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
                {selectedLog.discoveryRunId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Discovery Run ID
                    </Label>
                    <p className="break-all font-mono text-xs">
                      {selectedLog.discoveryRunId}
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
