"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  Tag,
  Sparkles,
  ScrollText,
  Mountain,
  ExternalLink,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/markets", label: "Markets", icon: MapPin },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/discovery", label: "Discovery", icon: Sparkles },
  { href: "/admin/logs", label: "LLM Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Branding */}
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Mountain className="h-6 w-6 text-green-700" />
        <span className="text-lg font-bold tracking-tight">2nd Summit</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Public Site
        </Link>
        <p className="px-2 text-xs text-muted-foreground">
          Move &middot; Discover &middot; Connect
        </p>
      </div>
    </aside>
  );
}
