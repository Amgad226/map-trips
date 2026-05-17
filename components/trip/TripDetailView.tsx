"use client";

import Link from "next/link";
import { Trip, Media, Keyword } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";
import TripGallery from "./TripGallery";
import KeywordTags from "./KeywordTags";

interface Props {
  trip: Trip & { media: Media[]; keywords: Keyword[] };
  isAdmin?: boolean;
}

export default function TripDetailView({ trip, isAdmin }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("tripDetail.backToMap")}
          </Link>

          {isAdmin && (
            <Link
              href={`/admin/trips/${trip.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/15"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t("actions.edit")}
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-3 tracking-tight">
            {trip.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(trip.tripDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {trip.latitude.toFixed(4)}, {trip.longitude.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Cover image */}
        {trip.coverImage && (
          <div className="mb-10">
            <img
              src={getProxyUrl(trip.coverImage)}
              alt={trip.title}
              className="w-full max-h-[500px] object-cover rounded-3xl shadow-2xl shadow-foreground/5"
            />
          </div>
        )}

        {/* Keywords */}
        {trip.keywords.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t("tripDetail.keywords")}
            </h2>
            <KeywordTags keywords={trip.keywords} />
          </div>
        )}

        {/* Description */}
        {trip.description && (
          <div className="mb-12">
            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {trip.description}
            </p>
          </div>
        )}

        {/* Media gallery */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">{t("tripDetail.gallery")}</h2>
          <TripGallery media={trip.media} />
        </div>
      </main>
    </>
  );
}
