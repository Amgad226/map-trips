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
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

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

  if (!media) return null;

  const videoSrc = media ? getProxyUrl(media.url) : "";

  function handleWheel(e: React.WheelEvent) {
    if (media!.type !== "IMAGE") return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
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
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
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

  const speeds = [1, 1.25, 1.5, 2, 3, 4];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
        <div className="flex items-center gap-3">
          {media!.isFlagged && showFlagged && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              {t("modal.flaggedContent")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Download button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
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
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10 p-3 rounded-full bg-black/20 hover:bg-black/40 transition-colors backdrop-blur-sm"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next button */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10 p-3 rounded-full bg-black/20 hover:bg-black/40 transition-colors backdrop-blur-sm"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Media */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {media!.type === "VIDEO" ? (
          <div className="flex flex-col items-center gap-3">
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              autoPlay
              className="max-w-full max-h-[70vh] rounded-2xl"
            />
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {/* Speed controls */}
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-xl p-1.5">
                <span className="text-white/60 text-xs px-2 font-medium">{t("video.speed")}</span>
                {speeds.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      playbackRate === speed
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    ×{speed}
                  </button>
                ))}
              </div>

            </div>
          </div>
        ) : (
          <div
            ref={imageRef}
            className="relative overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
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
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              draggable={false}
            />
            {scale > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white/80 text-xs px-3 py-1.5 rounded-full pointer-events-none">
                {Math.round(scale * 100)}% · Double-click to reset · Scroll to zoom · Drag to pan
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
