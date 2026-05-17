"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Media } from "@prisma/client";
import GalleryGrid from "./GalleryGrid";

interface TripGalleryProps {
  media: Media[];
}

export default function TripGallery({ media }: TripGalleryProps) {
  const { t } = useTranslation();
  const [showFlagged, setShowFlagged] = useState(false);

  const visibleMedia = showFlagged
    ? media
    : media.filter((m) => !m.isFlagged);

  const flaggedCount = media.filter((m) => m.isFlagged).length;

  return (
    <div>
      {/* Filter bar */}
      {flaggedCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {t("gallery.flaggedHidden", { count: flaggedCount })}
          </p>
          <button
            onClick={() => setShowFlagged((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              showFlagged
                ? "bg-danger/10 text-danger hover:bg-danger/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showFlagged ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              )}
              {showFlagged ? null : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              )}
            </svg>
            {showFlagged ? t("gallery.hideFlagged") : t("gallery.showFlagged")}
          </button>
        </div>
      )}

      {visibleMedia.length === 0 && !showFlagged && flaggedCount > 0 && (
        <div className="text-center text-muted-foreground py-12 bg-muted rounded-2xl">
          <p className="text-sm">{t("gallery.allFlagged")}</p>
          <button
            onClick={() => setShowFlagged(true)}
            className="mt-2 text-sm text-primary hover:text-primary/80 font-medium"
          >
            {t("gallery.showFlaggedContent")}
          </button>
        </div>
      )}

      <GalleryGrid media={visibleMedia} showFlagged={showFlagged} />
    </div>
  );
}
