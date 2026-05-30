"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Trip } from "@prisma/client";

interface TripFormProps {
  trip?: Trip | null;
  action: (formData: FormData) => Promise<void>;
}

export default function TripForm({ trip, action }: TripFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(trip?.color ?? "#3b82f6");

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

        {/* Color picker */}
        <div>
          <label htmlFor="color" className="block text-sm font-medium text-foreground mb-1.5">
            {t("tripForm.color")}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="color"
              name="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded-xl border border-border bg-card cursor-pointer"
            />
            <span className="text-sm text-muted-foreground font-mono">{color}</span>
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
    </>
  );
}
