"use client";

import { useState } from "react";
import { Station, Media } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";
import LocationPicker from "./LocationPicker";

interface StationManagerProps {
  stations: Station[];
  media: Media[];
  onCreate: (formData: FormData) => Promise<void>;
  onUpdate: (stationId: number, formData: FormData) => Promise<void>;
  onDelete: (stationId: number) => Promise<void>;
  onReorder: (stationIds: number[]) => Promise<void>;
}

export default function StationManager({
  stations,
  media,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: StationManagerProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function getStationCover(stationId: number): Media | undefined {
    return media.find((m) => m.stationId === stationId && m.isStationCover);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData(e.currentTarget);
      await onCreate(formData);
      e.currentTarget.reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("tripForm.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(stationId: number, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData(e.currentTarget);
      await onUpdate(stationId, formData);
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("tripForm.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(stationId: number) {
    if (!confirm(t("actions.deleteConfirm"))) return;
    setLoading(true);
    try {
      await onDelete(stationId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("tripForm.error"));
    } finally {
      setLoading(false);
    }
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stations.length) return;
    const newOrder = [...stations];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    onReorder(newOrder.map((s) => s.id));
  }

  function handleLocationSelect(stationId: number | null, lat: number, lng: number) {
    if (stationId === null) {
      const form = document.getElementById("create-station-form") as HTMLFormElement | null;
      if (form) {
        (form.elements.namedItem("latitude") as HTMLInputElement).value = lat.toString();
        (form.elements.namedItem("longitude") as HTMLInputElement).value = lng.toString();
      }
    } else {
      const form = document.getElementById(`edit-station-form-${stationId}`) as HTMLFormElement | null;
      if (form) {
        (form.elements.namedItem("latitude") as HTMLInputElement).value = lat.toString();
        (form.elements.namedItem("longitude") as HTMLInputElement).value = lng.toString();
      }
    }
    setShowPicker(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger border border-danger/20">
          {error}
        </div>
      )}

      {/* Create form */}
      <form id="create-station-form" onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("station.name")}</label>
            <input
              name="name"
              type="text"
              required
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("station.location")}</label>
            <button
              type="button"
              onClick={() => setShowPicker(showPicker === -1 ? null : -1)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t("tripForm.selectOnMap")}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input name="latitude" type="number" step="any" required placeholder={t("tripForm.latitude")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input name="longitude" type="number" step="any" required placeholder={t("tripForm.longitude")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {t("station.add")}
        </button>

        {showPicker === -1 && (
          <LocationPicker
            onSelect={(lat, lng) => handleLocationSelect(null, lat, lng)}
            onClose={() => setShowPicker(null)}
          />
        )}
      </form>

      {/* Stations list */}
      <div className="space-y-2">
        {stations.map((station, index) => {
          const coverMedia = getStationCover(station.id);
          return (
            <div key={station.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {coverMedia && editingId !== station.id && (
                <div className="relative h-24 w-full">
                  <img
                    src={getProxyUrl(coverMedia.thumbnailUrl || coverMedia.url)}
                    alt={station.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              )}
              <div className="p-4">
                {editingId === station.id ? (
                  <form
                    id={`edit-station-form-${station.id}`}
                    onSubmit={(e) => handleUpdate(station.id, e)}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        name="name"
                        type="text"
                        required
                        defaultValue={station.name}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPicker(showPicker === station.id ? null : station.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t("tripForm.selectOnMap")}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input name="latitude" type="number" step="any" required defaultValue={station.latitude} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      <input name="longitude" type="number" step="any" required defaultValue={station.longitude} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                        {t("tripForm.updateTrip")}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-all">
                        {t("tripForm.cancel")}
                      </button>
                    </div>

                    {showPicker === station.id && (
                      <LocationPicker
                        initialLat={station.latitude}
                        initialLng={station.longitude}
                        onSelect={(lat, lng) => handleLocationSelect(station.id, lat, lng)}
                        onClose={() => setShowPicker(null)}
                      />
                    )}
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {coverMedia && (
                        <img
                          src={getProxyUrl(coverMedia.thumbnailUrl || coverMedia.url)}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-border"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm text-foreground">{station.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReorder(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleReorder(index, "down")}
                        disabled={index === stations.length - 1}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setEditingId(station.id)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(station.id)}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
