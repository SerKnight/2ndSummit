"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Tag, Sparkles } from "lucide-react";
import { statusColors } from "@/lib/pillars";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const markets = useQuery(api.markets.list);
  const eventCounts = useQuery(api.events.getCountsByStatus, {});
  const categories = useQuery(api.categories.list, {});
  const discoveryRuns = useQuery(api.discoveryRuns.list, {});

  const recentRuns = discoveryRuns?.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to 2nd Summit — Move, Discover, Connect
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Markets</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {markets === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{markets.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {eventCounts === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{eventCounts.total}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {categories === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{categories.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Discovery Runs
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {discoveryRuns === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{discoveryRuns.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Status Breakdown */}
      {eventCounts && (
        <Card>
          <CardHeader>
            <CardTitle>Events by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(eventCounts)
                .filter(([key]) => key !== "total")
                .map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={statusColors[status] || ""}
                    >
                      {status}
                    </Badge>
                    <span className="text-lg font-semibold">{String(count)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin/markets">
            <Button variant="outline">
              <MapPin className="mr-2 h-4 w-4" />
              Manage Markets
            </Button>
          </Link>
          <Link href="/admin/events">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View Events
            </Button>
          </Link>
          <Link href="/admin/discovery">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Run Discovery
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Discovery Runs */}
      {recentRuns && recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Discovery Runs</CardTitle>
            <CardDescription>Latest event discovery activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div
                  key={run._id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{run.marketName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(run.startedAt).toLocaleDateString()} &middot;{" "}
                      {run.eventsFound} events found
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      run.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : run.status === "running"
                          ? "bg-blue-100 text-blue-800"
                          : run.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
