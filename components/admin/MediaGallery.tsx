"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Media, Station } from "@prisma/client";
import { getProxyUrl } from "@/lib/utils";

interface MediaGalleryProps {
  tripId: number;
  media: Media[];
  stations?: Station[];
  coverImage: string | null;
  onDelete: (mediaId: number) => Promise<void>;
  onReorder: (mediaIds: number[]) => Promise<void>;
  onSetCover: (url: string | null) => Promise<void>;
  onToggleFlag: (mediaId: number) => Promise<void>;
  onMoveMedia?: (mediaId: number, stationId: number | null) => Promise<void>;
  onSetStationCover?: (mediaId: number, stationId: number | null) => Promise<void>;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function MediaGallery({
  media,
  stations = [],
  coverImage,
  onDelete,
  onReorder,
  onSetCover,
  onToggleFlag,
  onMoveMedia,
  onSetStationCover,
}: Omit<MediaGalleryProps, "tripId">) {
  const { t } = useTranslation();
  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);
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

  function handleDelete(mediaId: number) {
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

  function handleToggleFlag(mediaId: number) {
    startTransition(async () => {
      await onToggleFlag(mediaId);
    });
  }

  function handleMove(mediaId: number, stationId: number | null) {
    if (!onMoveMedia) return;
    startTransition(async () => {
      await onMoveMedia(mediaId, stationId);
      setMovingId(null);
    });
  }

  function handleSetStationCover(mediaId: number, stationId: number | null) {
    if (!onSetStationCover) return;
    startTransition(async () => {
      await onSetStationCover(mediaId, stationId);
    });
  }

  if (media.length === 0) {
    return (
      <div className="rounded-2xl bg-muted p-8 text-center text-muted-foreground text-sm">
        No media yet. Upload images and videos above.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {media.map((item, index) => (
        <div
          key={item.id}
          className={`relative rounded-2xl border-2 overflow-hidden bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 ${
            coverImage === item.url
              ? "border-warning ring-2 ring-warning/20"
              : "border-border"
          }`}
        >
          {/* Thumbnail */}
          <div className="relative aspect-square">
            <img
              src={getProxyUrl(item.thumbnailUrl || item.url)}
              alt=""
              className={`w-full h-full object-cover ${item.isFlagged ? "blur-sm" : ""}`}
            />
            {item.type === "VIDEO" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
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
            {item.isFlagged && (
              <div className="absolute top-2 right-2 bg-danger text-danger-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase backdrop-blur-sm">
                Flagged
              </div>
            )}
            {coverImage === item.url && (
              <div className="absolute top-2 left-2 bg-warning text-warning-foreground text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                Cover
              </div>
            )}
            {item.isStationCover && (
              <div className="absolute top-2 left-2 bg-info text-info-foreground text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                Station Cover
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Current: {formatBytes(item.fileSize)}</span>
              {item.fileSizeBeforeCompress && item.fileSizeBeforeCompress > 0 && (
                <span>Before: {formatBytes(item.fileSizeBeforeCompress)}</span>
              )}
            </div>
            {item.stationId && stationMap.has(item.stationId) && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {stationMap.get(item.stationId)?.name}
                </span>
              </div>
            )}
            {item.fileSizeBeforeCompress && item.fileSizeBeforeCompress > 0 && (
              <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{
                    width: `${Math.min(
                      (item.fileSize / item.fileSizeBeforeCompress) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1.5">
            {/* Cover button (images only) */}
            {item.type === "IMAGE" && (
              <button
                onClick={() =>
                  handleSetCover(coverImage === item.url ? null : item.url)
                }
                disabled={isPending}
                className={`w-full rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
                  coverImage === item.url
                    ? "bg-warning/15 text-warning-foreground hover:bg-warning/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                } disabled:opacity-50`}
              >
                {coverImage === item.url ? "Remove Cover" : "Set as Cover"}
              </button>
            )}

            {/* Station cover button (images assigned to a station) */}
            {item.type === "IMAGE" && item.stationId && onSetStationCover && (
              <button
                onClick={() =>
                  handleSetStationCover(item.id, item.isStationCover ? null : item.stationId)
                }
                disabled={isPending}
                className={`w-full rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
                  item.isStationCover
                    ? "bg-info/15 text-info hover:bg-info/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                } disabled:opacity-50`}
              >
                {item.isStationCover ? "Remove Station Cover" : "Set as Station Cover"}
              </button>
            )}

            {/* Move to station */}
            {onMoveMedia && stations.length > 0 && (
              <>
                {movingId === item.id ? (
                  <select
                    value={item.stationId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleMove(item.id, val ? parseInt(val, 10) : null);
                    }}
                    disabled={isPending}
                    className="w-full rounded-xl border border-border bg-background px-2 py-1.5 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus
                    onBlur={() => setMovingId(null)}
                  >
                    <option value="">— None / General —</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setMovingId(item.id)}
                    disabled={isPending}
                    className="w-full rounded-xl px-2 py-1.5 text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
                  >
                    {t("media.moveToStation")}
                  </button>
                )}
              </>
            )}

            {/* Flag button */}
            <button
              onClick={() => handleToggleFlag(item.id)}
              disabled={isPending}
              className={`w-full rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
                item.isFlagged
                  ? "bg-danger/15 text-danger hover:bg-danger/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              } disabled:opacity-50`}
            >
              {item.isFlagged ? "Unflag" : "Flag +18"}
            </button>

            {/* Reorder buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleReorder(index, "up")}
                disabled={index === 0 || isPending}
                className="flex-1 rounded-xl bg-muted px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 disabled:opacity-30 transition-colors"
              >
                ↑
              </button>
              <button
                onClick={() => handleReorder(index, "down")}
                disabled={index === media.length - 1 || isPending}
                className="flex-1 rounded-xl bg-muted px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 disabled:opacity-30 transition-colors"
              >
                ↓
              </button>
            </div>

            {/* Delete button */}
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id || isPending}
              className="w-full rounded-xl bg-danger/10 px-2 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors"
            >
              {deletingId === item.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
