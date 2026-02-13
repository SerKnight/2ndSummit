"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sparkles, Loader2, FileText, Plus } from "lucide-react";
import { runStatusColors } from "@/lib/pillars";
import Link from "next/link";

export default function DiscoveryPage() {
  const router = useRouter();
  const runs = useQuery(api.discoveryRuns.list, {});

  const formatDuration = (start: number, end?: number) => {
    if (!end) return "In progress...";
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discovery</h1>
          <p className="text-muted-foreground">
            Discover events using AI-powered web search
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/discovery/templates">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Manage Templates
            </Button>
          </Link>
          <Link href="/admin/discovery/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Discovery Run
            </Button>
          </Link>
        </div>
      </div>

      {/* Discovery Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Discovery Runs
          </CardTitle>
          <CardDescription>
            History of all event discovery runs — click a run to see full details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-2 text-muted-foreground">
                No discovery runs yet.
              </p>
              <Link href="/admin/discovery/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Run
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events Found</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Config</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow
                      key={run._id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/discovery/runs/${run._id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {run.marketName}
                      </TableCell>
                      <TableCell>
                        {new Date(run.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={runStatusColors[run.status] || ""}
                        >
                          {run.status === "running" && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{run.eventsFound}</TableCell>
                      <TableCell>
                        {formatDuration(run.startedAt, run.completedAt)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {run.categoriesSearched.slice(0, 3).join(", ")}
                        {run.categoriesSearched.length > 3 &&
                          ` +${run.categoriesSearched.length - 3} more`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {run.config ? (
                          <span>
                            {run.config.timeRangeDays}d ·{" "}
                            {run.config.radiusMiles}mi · batch{" "}
                            {run.config.batchSize}
                          </span>
                        ) : (
                          <span className="italic">defaults</span>
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
    </div>
  );
}
