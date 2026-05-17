"use client";

import { useState, useTransition } from "react";
import { Media } from "@prisma/client";
import { getProxyUrl } from "@/lib/utils";

interface MediaGalleryProps {
  tripId: string;
  media: Media[];
  coverImage: string | null;
  onDelete: (mediaId: string) => Promise<void>;
  onReorder: (mediaIds: string[]) => Promise<void>;
  onSetCover: (url: string | null) => Promise<void>;
}

export default function MediaGallery({
  tripId,
  media,
  coverImage,
  onDelete,
  onReorder,
  onSetCover,
}: MediaGalleryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReorder(index: number, direction: "up" | "down") {
    if (isPending) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= media.length) return;

    const newOrder = [...media];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    startTransition(async () => {
      await onReorder(newOrder.map((m) => m.id));
    });
  }

  function handleDelete(mediaId: string) {
    if (!confirm("Are you sure you want to delete this media?")) return;
    setDeletingId(mediaId);
    startTransition(async () => {
      try {
        await onDelete(mediaId);
      } finally {
        setDeletingId(null);
      }
    });
  }

  function handleSetCover(url: string | null) {
    startTransition(async () => {
      await onSetCover(url);
    });
  }

  if (media.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500 text-sm">
        No media yet. Upload images and videos above.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {media.map((item, index) => (
        <div
          key={item.id}
          className={`relative rounded-xl border-2 overflow-hidden bg-white ${
            coverImage === item.url
              ? "border-yellow-400 ring-2 ring-yellow-100"
              : "border-gray-200"
          }`}
        >
          {/* Thumbnail */}
          <div className="relative aspect-square">
            <img
              src={getProxyUrl(item.thumbnailUrl || item.url)}
              alt=""
              className="w-full h-full object-cover"
            />
            {item.type === "VIDEO" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
            {coverImage === item.url && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                Cover
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            {/* Cover button (images only) */}
            {item.type === "IMAGE" && (
              <button
                onClick={() =>
                  handleSetCover(coverImage === item.url ? null : item.url)
                }
                disabled={isPending}
                className={`w-full rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  coverImage === item.url
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                {coverImage === item.url ? "Remove Cover" : "Set as Cover"}
              </button>
            )}

            {/* Reorder buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => handleReorder(index, "up")}
                disabled={index === 0 || isPending}
                className="flex-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => handleReorder(index, "down")}
                disabled={index === media.length - 1 || isPending}
                className="flex-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-30"
              >
                ↓
              </button>
            </div>

            {/* Delete button */}
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id || isPending}
              className="w-full rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              {deletingId === item.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
