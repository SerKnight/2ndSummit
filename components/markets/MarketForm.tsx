"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LocationSearch } from "./LocationSearch";
import { MarketMap } from "./MarketMap";
import { Loader2 } from "lucide-react";

interface MarketFormData {
  name: string;
  regionDescription: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  zipCode?: string;
  zipCodes?: string[];
}

interface MarketFormProps {
  initialData?: MarketFormData;
  onSubmit: (data: MarketFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
}

export function MarketForm({
  initialData,
  onSubmit,
  submitLabel,
  isSubmitting,
}: MarketFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [regionDescription, setRegionDescription] = useState(
    initialData?.regionDescription ?? ""
  );
  const [latitude, setLatitude] = useState(initialData?.latitude ?? 0);
  const [longitude, setLongitude] = useState(initialData?.longitude ?? 0);
  const [radiusMiles, setRadiusMiles] = useState(
    initialData?.radiusMiles ?? 15
  );
  const [zipCode, setZipCode] = useState(initialData?.zipCode ?? "");
  const [zipCodes, setZipCodes] = useState(
    initialData?.zipCodes?.join(", ") ?? ""
  );
  const [flyToTrigger, setFlyToTrigger] = useState(0);

  const handleLocationSelect = (
    lat: number,
    lng: number,
    _displayName?: string
  ) => {
    void _displayName;
    setLatitude(lat);
    setLongitude(lng);
    setFlyToTrigger((t) => t + 1);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      regionDescription,
      latitude,
      longitude,
      radiusMiles,
      zipCode: zipCode || undefined,
      zipCodes: zipCodes
        ? zipCodes
            .split(",")
            .map((z) => z.trim())
            .filter(Boolean)
        : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left column — form fields */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Denver Metro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Region Description</Label>
            <Input
              value={regionDescription}
              onChange={(e) => setRegionDescription(e.target.value)}
              placeholder="Denver, CO and surrounding 15-mile radius"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Location Search</Label>
            <LocationSearch onSelect={handleLocationSelect} />
            <p className="text-xs text-muted-foreground">
              Search for a city or click the map to set the center point.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                type="number"
                step="any"
                value={latitude || ""}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                placeholder="39.7392"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="any"
                value={longitude || ""}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                placeholder="-104.9903"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Radius (miles)</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {radiusMiles} mi
              </span>
            </div>
            <Slider
              value={[radiusMiles]}
              onValueChange={([v]) => setRadiusMiles(v)}
              min={1}
              max={100}
              step={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="80202"
              />
            </div>
            <div className="space-y-2">
              <Label>Zip Codes (comma-separated)</Label>
              <Input
                value={zipCodes}
                onChange={(e) => setZipCodes(e.target.value)}
                placeholder="80202, 80203, 80204"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>

        {/* Right column — map */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-md border">
            <MarketMap
              lat={latitude}
              lng={longitude}
              radiusMiles={radiusMiles}
              onMapClick={handleMapClick}
              flyToTrigger={flyToTrigger}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Click the map to reposition the center. The blue circle shows the
            market radius.
          </p>
        </div>
      </div>
    </form>
  );
}
