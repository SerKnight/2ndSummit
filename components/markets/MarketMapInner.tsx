"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MarketMapInnerProps {
  lat: number;
  lng: number;
  radiusMiles: number;
  onMapClick: (lat: number, lng: number) => void;
  flyToTrigger?: number;
}

function ClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToHandler({
  lat,
  lng,
  flyToTrigger,
}: {
  lat: number;
  lng: number;
  flyToTrigger?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (flyToTrigger && flyToTrigger > 0) {
      map.flyTo([lat, lng], 11, { duration: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTrigger]);

  return null;
}

const MILES_TO_METERS = 1609.34;

export function MarketMapInner({
  lat,
  lng,
  radiusMiles,
  onMapClick,
  flyToTrigger,
}: MarketMapInnerProps) {
  const radiusMeters = radiusMiles * MILES_TO_METERS;
  const hasCenter = lat !== 0 || lng !== 0;

  return (
    <MapContainer
      center={hasCenter ? [lat, lng] : [39.8283, -98.5795]}
      zoom={hasCenter ? 11 : 4}
      className="h-full w-full rounded-md"
      style={{ minHeight: 400 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      <FlyToHandler lat={lat} lng={lng} flyToTrigger={flyToTrigger} />
      {hasCenter && (
        <Circle
          center={[lat, lng]}
          radius={radiusMeters}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      )}
    </MapContainer>
  );
}
