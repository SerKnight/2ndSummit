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
import { Sparkles, Loader2, Plus } from "lucide-react";
import { runStatusColors } from "@/lib/pillars";
import Link from "next/link";

export default function DiscoveryPage() {
  const router = useRouter();
  const jobs = useQuery(api.eventDiscoveryJobs.list, {});

  const formatDuration = (start: number, end?: number) => {
    if (!end) return "In progress...";
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const isRunning = (status: string) =>
    ["pending", "searching", "validating", "storing"].includes(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Event Discovery
          </h1>
          <p className="text-muted-foreground">
            Discover events using AI-powered web search
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/discovery/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Discovery Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Discovery Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Event Discovery Jobs
          </CardTitle>
          <CardDescription>
            History of all event discovery jobs — click a job to see full
            details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-2 text-muted-foreground">
                No discovery jobs yet.
              </p>
              <Link href="/admin/discovery/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Found</TableHead>
                    <TableHead>Validated</TableHead>
                    <TableHead>Stored</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow
                      key={job._id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/discovery/runs/${job._id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {job.marketName}
                      </TableCell>
                      <TableCell>{job.categoryName}</TableCell>
                      <TableCell>
                        {new Date(job.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={runStatusColors[job.status] || ""}
                        >
                          {isRunning(job.status) && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.eventsFound}</TableCell>
                      <TableCell>{job.eventsValidated ?? "—"}</TableCell>
                      <TableCell>{job.eventsStored ?? "—"}</TableCell>
                      <TableCell>
                        {formatDuration(job.startedAt, job.completedAt)}
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
