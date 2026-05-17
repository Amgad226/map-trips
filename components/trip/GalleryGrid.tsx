"use client";

import { useState, useCallback } from "react";
import { Media } from "@prisma/client";
import { getProxyUrl } from "@/lib/utils";
import MediaModal from "./MediaModal";

interface GalleryGridProps {
  media: Media[];
}

export default function GalleryGrid({ media }: GalleryGridProps) {
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
      <div className="text-center text-gray-400 py-12">
        <p>No photos or videos yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {media.map((item, index) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={getProxyUrl(item.thumbnailUrl || item.url)}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {item.type === "VIDEO" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <MediaModal
        media={selectedMedia}
        onClose={() => setSelectedIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </>
  );
}
