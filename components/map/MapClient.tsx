"use client";

import { useEffect, useRef, useState } from "react";
import { Trip } from "@prisma/client";
import { getProxyUrl } from "@/lib/utils";

interface MapClientProps {
  trips: Trip[];
}

type MapLayer = "normal" | "satellite";

export default function MapClient({ trips }: MapClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{ normal: any; satellite: any } | null>(null);
  const mountedRef = useRef(false);
  const [layer, setLayer] = useState<MapLayer>("normal");

  // Initialize map once
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!containerRef.current) return;

    import("leaflet").then((L) => {
      if (!containerRef.current) return;

      // Center on Syria
      const map = L.map(containerRef.current).setView([35.0, 38.5], 7);
      mapRef.current = map;

      const normalLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      );

      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        }
      );

      layersRef.current = { normal: normalLayer, satellite: satelliteLayer };
      normalLayer.addTo(map);

      const pinIcon = L.icon({
        iconUrl: "/pin.svg",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      trips.forEach((trip) => {
        const marker = L.marker([trip.latitude, trip.longitude], {
          icon: pinIcon,
        }).addTo(map);

        const coverProxy = getProxyUrl(trip.coverImage);
        marker.bindPopup(`
          <div style="min-width:200px;font-family:sans-serif;">
            ${coverProxy ? `<img src="${coverProxy}" alt="${trip.title}" style="width:100%;height:96px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : ""}
            <h3 style="font-weight:600;font-size:14px;color:#111827;margin:0 0 4px;">${trip.title}</h3>
            ${trip.description ? `<p style="font-size:12px;color:#6b7280;margin:0 0 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${trip.description}</p>` : ""}
            <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;">${new Date(trip.tripDate).toLocaleDateString()}</p>
            <a href="/trip/${trip.id}" style="font-size:12px;font-weight:500;color:#2563eb;text-decoration:none;">View details →</a>
          </div>
        `);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      mountedRef.current = false;
    };
  }, [trips]);

  // Toggle layers when state changes
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    if (layer === "normal") {
      map.removeLayer(layers.satellite);
      layers.normal.addTo(map);
    } else {
      map.removeLayer(layers.normal);
      layers.satellite.addTo(map);
    }
  }, [layer]);

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-4 right-4 z-[1000] flex gap-1 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-sm p-1">
        <button
          onClick={() => setLayer("normal")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            layer === "normal"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setLayer("satellite")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            layer === "satellite"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Satellite
        </button>
      </div>
    
    </div>
    
  );
}
