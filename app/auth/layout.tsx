"use client";

import ConvexClientProvider from "@/components/ConvexClientProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
