"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MarketForm } from "@/components/markets/MarketForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewMarketPage() {
  const router = useRouter();
  const createMarket = useMutation(api.markets.create);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    name: string;
    regionDescription: string;
    latitude: number;
    longitude: number;
    radiusMiles: number;
    zipCode?: string;
    zipCodes?: string[];
  }) => {
    setIsSubmitting(true);
    try {
      await createMarket(data);
      toast.success("Market created");
      router.push("/admin/markets");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create market"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/markets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Market</h1>
          <p className="text-muted-foreground">
            Define a new geographic region for event discovery
          </p>
        </div>
      </div>

      <MarketForm
        onSubmit={handleSubmit}
        submitLabel="Create Market"
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
