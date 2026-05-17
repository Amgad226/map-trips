"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

export default function LocationPicker({
  initialLat,
  initialLng,
  onSelect,
  onClose,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat !== undefined && initialLng !== undefined
      ? { lat: initialLat, lng: initialLng }
      : null
  );

  useEffect(() => {
    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      const defaultLat = initialLat ?? 35.0;
      const defaultLng = initialLng ?? 38.5;
      const zoom = initialLat !== undefined && initialLng !== undefined ? 10 : 7;

      const map = L.map(mapRef.current).setView([defaultLat, defaultLng], zoom);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      if (initialLat !== undefined && initialLng !== undefined) {
        markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
      }

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        setSelected({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
      });
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [initialLat, initialLng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("locationPicker.title")}</h3>
            {selected && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} className="flex-1 min-h-[400px]" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {t("locationPicker.cancel")}
          </button>
          <button
            onClick={() => {
              if (selected) {
                onSelect(selected.lat, selected.lng);
              }
            }}
            disabled={!selected}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
          >
            {t("locationPicker.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
