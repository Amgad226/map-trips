"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Trip } from "@prisma/client";
import LocationPicker from "./LocationPicker";

interface TripFormProps {
  trip?: Trip | null;
  action: (formData: FormData) => Promise<void>;
}

export default function TripForm({ trip, action }: TripFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [latitude, setLatitude] = useState<string>(
    trip?.latitude?.toString() ?? ""
  );
  const [longitude, setLongitude] = useState<string>(
    trip?.longitude?.toString() ?? ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await action(formData);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("tripForm.error"));
      }
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  function handleLocationSelect(lat: number, lng: number) {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    setShowPicker(false);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && (
          <div className="rounded-xl bg-danger/10 p-4 text-sm text-danger border border-danger/20">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1.5">
            {t("tripForm.title")}
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={trip?.title ?? ""}
            className="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
            {t("tripForm.description")}
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={trip?.description ?? ""}
            className="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all resize-y"
          />
        </div>

        {/* Location picker */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("tripForm.location")}
          </label>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted hover:border-border/80 transition-all"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {latitude && longitude
              ? `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`
              : t("tripForm.selectOnMap")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-foreground mb-1.5">
              {t("tripForm.latitude")}
            </label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              required
              min={-90}
              max={90}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-foreground mb-1.5">
              {t("tripForm.longitude")}
            </label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              required
              min={-180}
              max={180}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tripDate" className="block text-sm font-medium text-foreground mb-1.5">
            {t("tripForm.tripDate")}
          </label>
          <input
            id="tripDate"
            name="tripDate"
            type="date"
            required
            defaultValue={trip?.tripDate ? formatDate(new Date(trip.tripDate)) : ""}
            className="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>

        <input type="hidden" name="coverImage" defaultValue={trip?.coverImage ?? ""} />

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            {loading ? t("tripForm.saving") : trip ? t("tripForm.updateTrip") : t("tripForm.createTrip")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-xl bg-muted px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition-all"
          >
            {t("tripForm.cancel")}
          </button>
        </div>
      </form>

      {showPicker && (
        <LocationPicker
          initialLat={latitude ? parseFloat(latitude) : undefined}
          initialLng={longitude ? parseFloat(longitude) : undefined}
          onSelect={handleLocationSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
