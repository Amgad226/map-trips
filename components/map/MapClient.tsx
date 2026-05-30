"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Station, Trip } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";

interface MapClientProps {
  stations: (Station & { trip: Trip; _count: { media: number } })[];
}

type MapLayer = "normal" | "satellite";

interface TripFilter {
  trip: Trip;
  visible: boolean;
}

export default function MapClient({ stations }: MapClientProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<{ normal: import("leaflet").TileLayer; satellite: import("leaflet").TileLayer } | null>(null);
  const markersRef = useRef<Map<number, import("leaflet").Marker>>(new Map());
  const mountedRef = useRef(false);
  const [layer, setLayer] = useState<MapLayer>("normal");

  const trips = useMemo(() => {
    const map = new Map<number, Trip>();
    stations.forEach((s) => map.set(s.trip.id, s.trip));
    return Array.from(map.values());
  }, [stations]);

  const [filters, setFilters] = useState<Map<number, boolean>>(new Map());

  // Initialize filters when trips change
  useEffect(() => {
    setFilters((prev) => {
      const next = new Map(prev);
      trips.forEach((trip) => {
        if (!next.has(trip.id)) {
          next.set(trip.id, true);
        }
      });
      return next;
    });
  }, [trips]);

  // Initialize map once
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!containerRef.current) return;

    import("leaflet").then((L) => {
      if (!containerRef.current) return;
      if (mapRef.current) return;

      const container = containerRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any)._leaflet_id;
      }

      const map = L.map(container).setView([35.0, 38.5], 7);
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

      stations.forEach((station) => {
        const icon = L.divIcon({
          className: "custom-pin",
          html: `<div style="
            width:15px;height:15px;
            border-radius:50%;
            background:${station.trip.color};
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            cursor:pointer;
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        });

        const marker = L.marker([station.latitude, station.longitude], { icon }).addTo(map);
        const coverProxy = getProxyUrl(station.trip.coverImage);
        marker.bindPopup(`
          ${
            coverProxy
              ? `<img src="${coverProxy}" alt="${station.name}" style="width:100%;height:96px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`
              : ""
          }
          <div style="min-width:200px;font-family:sans-serif;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${station.trip.color};"></div>
              <span style="font-size:11px;color:#6b7280;">${station.trip.title}</span>
            </div>
            <h3 style="font-weight:600;font-size:14px;color:#111827;margin:0 0 4px;">${station.name}</h3>
            <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;">
              ${station._count.media} ${station._count.media === 1 ? "media item" : "media items"}
            </p>
            <div style="display:flex;gap:8px;">
              <a href="/trip/${station.trip.id}#station-${station.id}" style="font-size:12px;font-weight:500;color:#2563eb;text-decoration:none;">${t("map.viewDetails")}</a>
              </div>
          </div>
        `);

        markersRef.current.set(station.id, marker);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
      mountedRef.current = false;
    };
  }, [stations, t]);

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

  // Toggle marker visibility based on filters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stations.forEach((station) => {
      const marker = markersRef.current.get(station.id);
      if (!marker) return;

      const visible = filters.get(station.trip.id) ?? true;
      if (visible) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      }
    });
  }, [filters, stations]);

  function toggleTrip(tripId: number) {
    setFilters((prev) => {
      const next = new Map(prev);
      next.set(tripId, !prev.get(tripId));
      return next;
    });
  }

  function showAll() {
    setFilters((prev) => {
      const next = new Map(prev);
      trips.forEach((t) => next.set(t.id, true));
      return next;
    });
  }

  function hideAll() {
    setFilters((prev) => {
      const next = new Map(prev);
      trips.forEach((t) => next.set(t.id, false));
      return next;
    });
  }

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Trip filter */}
      <div className="absolute top-4 left-4 z-[1000] max-w-[200px] bg-card/90 backdrop-blur-md border border-border rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-foreground">{t("map.trips")}</h3>
          <div className="flex gap-1">
            <button onClick={showAll} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors">
              {t("map.all")}
            </button>
            <button onClick={hideAll} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors">
              {t("map.none")}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
          {trips.map((trip) => {
            const visible = filters.get(trip.id) ?? true;
            return (
              <button
                key={trip.id}
                onClick={() => toggleTrip(trip.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left ${
                  visible ? "bg-muted/60 hover:bg-muted" : "opacity-50 hover:opacity-70"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: trip.color }}
                />
                <span className="truncate text-foreground">{trip.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer toggle */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-1 bg-card/80 backdrop-blur-md border border-border rounded-xl shadow-lg p-1">
        <button
          onClick={() => setLayer("normal")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            layer === "normal"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("map.normal")}
        </button>
        <button
          onClick={() => setLayer("satellite")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            layer === "satellite"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("map.satellite")}
        </button>
      </div>
    </div>
  );
}
