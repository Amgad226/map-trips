"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { Media } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";

interface MediaModalProps {
  media: Media | null;
  showFlagged?: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function MediaModal({ media, showFlagged, onClose, onPrev, onNext }: MediaModalProps) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext]
  );

  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, media]);

  // Reset zoom when media changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  }, [media?.id]);

  // Non-passive wheel listener to fix preventDefault error
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || media?.type !== "IMAGE") return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      setScale((prev) => {
        const next = Math.min(Math.max(prev + delta, 0.3), 5);
        return next;
      });
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [media?.type, media?.id]);

  if (!media) return null;

  const videoSrc = media ? getProxyUrl(media.url) : "";

  function zoomIn() {
    setScale((prev) => Math.min(prev + 0.25, 5));
  }

  function zoomOut() {
    setScale((prev) => Math.max(prev - 0.25, 0.3));
  }

  function resetZoom() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (media!.type !== "IMAGE" || scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleDoubleClick() {
    if (media!.type !== "IMAGE") return;
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  }

  function handleActivity() {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (media?.type === "IMAGE" && scale > 1) {
        setShowControls(false);
      }
    }, 2500);
  }

  async function handleDownload() {
    try {
      const url = media!.type === "VIDEO" ? videoSrc : getProxyUrl(media!.url);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = media!.type === "VIDEO"
        ? "mp4"
        : (media!.url.split(".").pop() || "webp");
      a.download = `media-${media!.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  const speeds = [0.5, 1, 1.25, 1.5, 2];
  const zoomPercent = Math.round(scale * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
      onMouseMove={handleActivity}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          {media!.isFlagged && showFlagged && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {t("modal.flaggedContent")}
            </div>
          )}
          <span className="text-white/40 text-xs font-medium">
            {zoomPercent !== 100 && media!.type === "IMAGE" ? `${zoomPercent}%` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Download button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all backdrop-blur-sm border border-white/10"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all backdrop-blur-sm border border-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prev button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white z-10 p-2.5 rounded-full bg-white/5 hover:bg-white/15 transition-all backdrop-blur-sm border border-white/10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next button */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white z-10 p-2.5 rounded-full bg-white/5 hover:bg-white/15 transition-all backdrop-blur-sm border border-white/10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Media */}
      <div
        className="max-w-[92vw] max-h-[88vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {media!.type === "VIDEO" ? (
          <div className="flex flex-col items-center gap-3">
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              autoPlay
              className="max-w-full max-h-[72vh] rounded-2xl shadow-2xl"
            />
            {/* Speed controls */}
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-xl p-1 border border-white/10">
              <span className="text-white/50 text-[10px] px-2 font-medium uppercase tracking-wider">{t("video.speed")}</span>
              {speeds.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackRate(speed)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    playbackRate === speed
                      ? "bg-white text-black shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  ×{speed}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={imageContainerRef}
            className="relative overflow-hidden rounded-xl cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={getProxyUrl(media!.url)}
              alt=""
              className="max-w-full max-h-[85vh] object-contain select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Bottom zoom controls (images only) */}
      {media!.type === "IMAGE" && (
        <div
          className={`absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10 transition-opacity duration-300 z-20 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-white/60 text-xs font-medium tabular-nums min-w-[44px] text-center">
            {zoomPercent}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="px-2.5 py-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-[11px] font-medium"
            title="Reset zoom"
          >
            {t("tripForm.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
