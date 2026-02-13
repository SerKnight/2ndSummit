"use client";

import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Navbar } from "@/components/user/Navbar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <div className="brand-theme">
        <Navbar />
        {children}
      </div>
    </ConvexClientProvider>
  );
}
