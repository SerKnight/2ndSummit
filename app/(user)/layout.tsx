"use client";

import { useEffect } from "react";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Navbar } from "@/components/user/Navbar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strip dark class from <html> when entering user pages
  // (admin's ThemeProvider may have added it)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <ConvexClientProvider>
      <div className="brand-theme">
        <Navbar />
        {children}
      </div>
    </ConvexClientProvider>
  );
}
