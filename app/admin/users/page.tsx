"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoreHorizontal, ShieldCheck, ShieldMinus, Trash2 } from "lucide-react";

export default function UsersPage() {
  const users = useQuery(api.users.list);
  const viewer = useQuery(api.users.viewer);
  const [detailId, setDetailId] = useState<Id<"users"> | null>(null);
  const userDetail = useQuery(
    api.users.getDetail,
    detailId ? { id: detailId } : "skip"
  );

  const updateRole = useMutation(api.users.updateRole);
  const removeUser = useMutation(api.users.remove);

  const handleToggleRole = async (
    userId: Id<"users">,
    currentRole: string | undefined
  ) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      await updateRole({ id: userId, role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleDelete = async (userId: Id<"users">) => {
    if (viewer && userId === viewer._id) {
      toast.error("Cannot delete yourself");
      return;
    }
    if (!confirm("Delete this user? This will remove all their auth data and cannot be undone.")) {
      return;
    }
    try {
      await removeUser({ id: userId });
      toast.success("User deleted");
      if (detailId === userId) setDetailId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user"
      );
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage team members and access
        </p>
      </div>

      {users === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No users yet</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user._id}
                  className="cursor-pointer"
                  onClick={() => setDetailId(user._id)}
                >
                  <TableCell className="font-medium">
                    {user.name || "—"}
                  </TableCell>
                  <TableCell>{user.email || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.role === "admin"
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {user.role || "member"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(user._creationTime)}
                  </TableCell>
                  <TableCell>{user.activeSessions}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleRole(user._id, user.role)
                          }
                        >
                          {user.role === "admin" ? (
                            <>
                              <ShieldMinus className="mr-2 h-4 w-4" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Toggle Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          disabled={
                            viewer !== null &&
                            viewer !== undefined &&
                            user._id === viewer._id
                          }
                          onClick={() => handleDelete(user._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
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

      {/* User Detail Sheet */}
      <Sheet
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {userDetail?.name || "User Detail"}
            </SheetTitle>
          </SheetHeader>
          {userDetail && (
            <div className="mt-6 space-y-6">
              {/* User Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Name
                    </Label>
                    <p className="text-sm">{userDetail.name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Email
                    </Label>
                    <p className="text-sm">{userDetail.email || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Role
                    </Label>
                    <div className="mt-0.5">
                      <Badge
                        variant="outline"
                        className={
                          userDetail.role === "admin"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {userDetail.role || "member"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Created
                    </Label>
                    <p className="text-sm">
                      {formatDateTime(userDetail._creationTime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Active Sessions ({userDetail.activeSessions.length})
                </Label>
                {userDetail.activeSessions.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {userDetail.activeSessions.map((session) => (
                      <div
                        key={session._id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <span className="text-muted-foreground">
                          Expires:{" "}
                        </span>
                        {formatDateTime(session.expirationTime)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No active sessions
                  </p>
                )}
              </div>

              {/* Auth Provider */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Auth Provider
                </Label>
                <p className="mt-1 text-sm">
                  {userDetail.accounts.length > 0
                    ? userDetail.accounts
                        .map((a) => a.provider)
                        .join(", ")
                    : "—"}
                </p>
              </div>

              {/* Activity Placeholder */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Activity
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Activity tracking coming soon
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
