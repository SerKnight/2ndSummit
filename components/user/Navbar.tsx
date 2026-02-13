"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mountain, Menu, X, User, LogOut, Settings } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Mountain className="h-7 w-7 text-amber-400" />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-amber-400">2nd</span>Summit
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === "/"
                  ? "text-white"
                  : "text-gray-300 hover:text-white"
              )}
            >
              Home
            </Link>
            <Link
              href="/calendar"
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === "/calendar"
                  ? "text-white"
                  : "text-gray-300 hover:text-white"
              )}
            >
              Experiences
            </Link>

            <div className="ml-4 flex items-center gap-2">
              {isLoading ? (
                <div className="h-8 w-20" />
              ) : isAuthenticated ? (
                <AuthenticatedMenu />
              ) : (
                <>
                  <Link href="/auth">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button
                      size="sm"
                      className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
                    >
                      Join 2nd Summit
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-2 text-gray-300 hover:text-white"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-800 pb-4">
          <div className="space-y-1 px-4 pt-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Home
            </Link>
            <Link
              href="/calendar"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Experiences
            </Link>
            {!isLoading && !isAuthenticated && (
              <div className="pt-3 space-y-2">
                <Link href="/auth" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-800">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold">
                    Join 2nd Summit
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function AuthenticatedMenu() {
  const user = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white hover:bg-gray-800 gap-2"
        >
          <User className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {user?.name || user?.email || "Account"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/admin" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Admin
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
