"use client";

import Link from "next/link";
import { Trip, Media } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";

interface TripCardProps {
  trip: Trip & { media?: Media[] };
}

export default function TripCard({ trip }: TripCardProps) {
  const { t } = useTranslation();
  const imageCount = trip.media?.filter((m) => m.type === "IMAGE").length || 0;
  const videoCount = trip.media?.filter((m) => m.type === "VIDEO").length || 0;

  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5">
      {/* Cover image or placeholder */}
      <Link href={`/trip/${trip.id}`} className="block relative aspect-[16/10] bg-muted">
        {trip.coverImage ? (
          <img
            src={getProxyUrl(trip.coverImage)}
            alt={trip.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-border">
            <svg
              className="w-12 h-12 text-muted-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          {imageCount > 0 && (
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {imageCount}
            </span>
          )}
          {videoCount > 0 && (
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {videoCount}
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/trip/${trip.id}`} className="block">
          <h3 className="font-semibold text-card-foreground mb-1 truncate group-hover:text-primary transition-colors">{trip.title}</h3>
        </Link>
        <p className="text-xs text-muted-foreground mb-3">
          {new Date(trip.tripDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/trips/${trip.id}`}
            className="flex-1 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary text-center hover:bg-primary/20 transition-colors"
          >
            {t("actions.edit")}
          </Link>
          <Link
            href={`/trip/${trip.id}`}
            target="_blank"
            className="flex-1 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground text-center hover:bg-muted/80 transition-colors"
          >
            {t("actions.view")}
          </Link>
        </div>
      </div>
    </div>
  );
}
