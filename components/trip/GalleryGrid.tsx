"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Media } from "@prisma/client";
import { getProxyUrl } from "@/lib/utils";
import MediaModal from "./MediaModal";

interface GalleryGridProps {
  media: Media[];
  showFlagged?: boolean;
}

export default function GalleryGrid({ media, showFlagged }: GalleryGridProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedMedia = selectedIndex !== null ? media[selectedIndex] : null;

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : media.length - 1));
  }, [media.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null && prev < media.length - 1 ? prev + 1 : 0));
  }, [media.length]);

  if (media.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>{t("tripDetail.noMedia")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {media.map((item, index) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-muted cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={getProxyUrl(item.thumbnailUrl || item.url)}
              alt=""
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                item.isFlagged && !showFlagged ? "blur-lg brightness-50" : ""
              } ${item.isFlagged && showFlagged ? "blur-[2px]" : ""}`}
            />
            {item.type === "VIDEO" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
            {item.isFlagged && (
              <div className="absolute top-2 right-2 bg-danger text-danger-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase backdrop-blur-sm">
                {t("media.flaggedBadge")}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          showFlagged={showFlagged}
          onClose={() => setSelectedIndex(null)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}
