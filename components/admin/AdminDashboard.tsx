"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Trip, Media } from "@prisma/client";
import TripCard from "./TripCard";

interface Props {
  trips: (Trip & { media?: Media[] })[];
}

export default function AdminDashboard({ trips }: Props) {
  const { t } = useTranslation();

  const totalTrips = trips.length;
  const totalMedia = trips.reduce((sum, t) => sum + (t.media?.length || 0), 0);
  const totalImages = trips.reduce(
    (sum, t) => sum + (t.media?.filter((m) => m.type === "IMAGE").length || 0),
    0
  );
  const totalVideos = trips.reduce(
    (sum, t) => sum + (t.media?.filter((m) => m.type === "VIDEO").length || 0),
    0
  );

  const stats = [
    { label: t("admin.trips"), value: totalTrips, icon: "🗺️" },
    { label: t("admin.totalMedia"), value: totalMedia, icon: "📸" },
    { label: t("admin.images"), value: totalImages, icon: "🖼️" },
    { label: t("admin.videos"), value: totalVideos, icon: "🎬" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("admin.dashboard")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-card border border-border p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">{t("admin.allTrips")}</h2>
        <Link
          href="/admin/trips/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
        >
          {t("admin.newTrip")}
        </Link>
      </div>

      {/* Trips grid */}
      {trips.length === 0 ? (
        <div className="rounded-2xl bg-card p-12 text-center text-muted-foreground border border-border">
          <svg
            className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
          <p className="text-sm">{t("admin.noTrips")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
