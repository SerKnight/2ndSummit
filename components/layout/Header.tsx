"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  const user = useQuery(api.users.viewer);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div />
      <UserMenu>
        {user?.name || user?.email || "User"}
      </UserMenu>
    </header>
  );
}
