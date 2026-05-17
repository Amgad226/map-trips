"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

interface MediaUploaderProps {
  tripId: number;
}

interface UploadEvent {
  id: number;
  event: string;
  message: string;
  serverProgress: number;
  r2Progress: number;
  timestamp: string;
}

interface FileUploadState {
  name: string;
  size: number;
  type: string;
  status: "queued" | "processing" | "uploading" | "done" | "error";
  progress: number;
  message: string;
  serverPercent: number;
  r2Percent: number;
  finalSize?: number;
  originalSize?: number;
  passthrough?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function SavedBadge({ original, final }: { original?: number; final?: number }) {
  if (!original || !final || final >= original) return null;
  const pct = Math.round(((original - final) / original) * 100);
  if (pct <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      {pct}%
    </span>
  );
}

function PassthroughBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 px-1.5 py-0.5 rounded-full border border-sky-100 dark:border-sky-900">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Fast
    </span>
  );
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: FileUploadState["status"] }) {
  switch (status) {
    case "queued":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">
          Waiting
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900">
          <Spinner className="w-3 h-3" />
          Processing
        </span>
      );
    case "uploading":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-900">
          <Spinner className="w-3 h-3" />
          Uploading
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Done
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Failed
        </span>
      );
  }
}

export default function MediaUploader({ tripId }: MediaUploaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [globalProgress, setGlobalProgress] = useState({ server: 0, r2: 0, message: "" });
  const [events, setEvents] = useState<UploadEvent[]>([]);
  const [showLog, setShowLog] = useState(false);
  const eventIdRef = useRef(0);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileList = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileList]);

    const newPreviews = new Map<string, string>();
    fileList.forEach((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        newPreviews.set(file.name, URL.createObjectURL(file));
      }
    });
    setPreviews((prev) => {
      const merged = new Map(prev);
      newPreviews.forEach((v, k) => merged.set(k, v));
      return merged;
    });
    setError("");
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  function removeFile(index: number) {
    const file = files[index];
    if (previews.has(file.name)) {
      URL.revokeObjectURL(previews.get(file.name)!);
      const newPreviews = new Map(previews);
      newPreviews.delete(file.name);
      setPreviews(newPreviews);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function addEvent(
    prev: UploadEvent[],
    event: string,
    message: string,
    serverProgress: number,
    r2Progress: number
  ): UploadEvent[] {
    const id = ++eventIdRef.current;
    const newEvent: UploadEvent = {
      id,
      event,
      message,
      serverProgress,
      r2Progress,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    return [...prev, newEvent];
  }

  function getStatusFromEvent(event: string): FileUploadState["status"] {
    if (event === "error") return "error";
    if (event.startsWith("r2:upload-start") || event.startsWith("r2:main-uploading") || event.startsWith("r2:thumb-uploading")) return "uploading";
    if (event.startsWith("r2:")) return "uploading";
    if (event === "file:complete" || event === "all:complete") return "done";
    if (event === "file:start") return "processing";
    if (event.startsWith("video:") || event === "file:processed") return "processing";
    return "queued";
  }

  function getMessageFromEvent(event: string, defaultMsg: string): string {
    if (event === "video:probing") return "Analyzing video...";
    if (event === "video:passthrough-try") return "Checking if re-encode is needed...";
    if (event === "video:passthrough-done") return "Video already optimized — skipping re-encode!";
    if (event === "video:full-encoding") return "Compressing video...";
    if (event === "video:lower-encoding") return "Creating smaller versions...";
    if (event === "video:thumbnail-encoding") return "Creating thumbnail...";
    if (event.startsWith("r2:")) return "Uploading to cloud...";
    if (event === "file:processed") return "Ready to upload";
    if (event === "db:saving") return "Saving...";
    return defaultMsg;
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    eventIdRef.current = 0;
    setEvents([]);
    setShowLog(false);

    const initialStates: FileUploadState[] = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      status: "queued",
      progress: 0,
      message: "Waiting...",
      serverPercent: 0,
      r2Percent: 0,
      originalSize: f.size,
    }));
    setFileStates(initialStates);
    setGlobalProgress({ server: 0, r2: 0, message: "Starting upload..." });

    const formData = new FormData();
    formData.append("tripId", tripId.toString());
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Upload failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.phase === "error") {
              throw new Error(data.message || "Upload failed");
            }
            if (data.phase === "done") {
              setGlobalProgress((prev) => ({ ...prev, server: 100, r2: 100, message: t("upload.complete") }));
            } else if (data.phase === "event") {
              const idx = typeof data.fileIndex === "number" ? data.fileIndex : -1;
              const evt = data.event as string;
              const msg = data.message as string;
              const srv = data.serverProgress ?? 0;
              const r2 = data.r2Progress ?? 0;

              setEvents((prev) => addEvent(prev, evt, msg, srv, r2));
              setGlobalProgress({ server: srv, r2, message: msg });

              setFileStates((prev) => {
                const next = [...prev];
                if (idx >= 0 && idx < next.length) {
                  const state = { ...next[idx] };
                  state.status = getStatusFromEvent(evt);
                  state.message = getMessageFromEvent(evt, msg);
                  state.serverPercent = srv;
                  state.r2Percent = r2;

                  if (evt === "file:processed" && data.meta) {
                    state.finalSize = data.meta.fileSize as number;
                    state.originalSize = data.meta.fileSizeBeforeCompress as number;
                    state.passthrough = data.meta.passthrough as boolean;
                  }

                  if (evt.startsWith("r2:") && evt.includes("progress")) {
                    const match = msg.match(/(\d+)%/);
                    if (match) state.progress = parseInt(match[1], 10);
                  }

                  next[idx] = state;
                }
                return next;
              });
            }
          } catch {
            // Ignore malformed lines
          }
        }
      }

      // Mark all as done
      setFileStates((prev) => prev.map((s) => (s.status !== "error" ? { ...s, status: "done" as const, message: "Complete" } : s)));

      // Clear files after successful upload
      previews.forEach((url) => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews(new Map());
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("media.uploadFailed"));
      }
      setFileStates((prev) => prev.map((s) => (s.status !== "done" ? { ...s, status: "error" as const, message: "Failed" } : s)));
    } finally {
      setUploading(false);
      setTimeout(() => {
        setFileStates([]);
        setEvents([]);
        setGlobalProgress({ server: 0, r2: 0, message: "" });
      }, 4000);
    }
  }

  const activeCount = useMemo(() => fileStates.filter((s) => s.status === "processing" || s.status === "uploading").length, [fileStates]);
  const doneCount = useMemo(() => fileStates.filter((s) => s.status === "done").length, [fileStates]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border bg-muted/50 hover:bg-muted hover:border-border/80"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">{t("media.dropFiles")}</p>
            <p className="text-xs text-muted-foreground">{t("media.sizeLimit")}</p>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          {/* Global progress panel */}
          {uploading && (
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeCount > 0 ? (
                      <Spinner className="w-4 h-4 text-primary" />
                    ) : doneCount > 0 ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                    <p className="text-sm font-semibold text-foreground">{globalProgress.message || "Uploading..."}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {doneCount}/{fileStates.length} done
                  </span>
                </div>

                {/* Server progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("upload.serverUpload")}</span>
                    <span className="font-semibold text-foreground">{globalProgress.server}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${globalProgress.server}%` }}
                    />
                  </div>
                </div>

                {/* R2 progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("upload.r2Storage")}</span>
                    <span className="font-semibold text-foreground">{globalProgress.r2}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${globalProgress.r2}%` }}
                    />
                  </div>
                </div>

                {/* Event log toggle */}
                {events.length > 0 && (
                  <button
                    onClick={() => setShowLog((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <svg className={`w-3 h-3 transition-transform ${showLog ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showLog ? "Hide details" : `Show details (${events.length})`}
                  </button>
                )}
              </div>

              {showLog && events.length > 0 && (
                <div className="border-t border-border max-h-48 overflow-y-auto">
                  <div className="px-4 py-2 space-y-1">
                    {events.slice(-20).map((evt) => (
                      <div key={evt.id} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground tabular-nums shrink-0">{evt.timestamp}</span>
                        <span className="text-muted-foreground break-words">{evt.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {files.map((file, index) => {
              const state = fileStates[index];
              const isVideo = file.type.startsWith("video/");
              const previewUrl = previews.get(file.name);

              return (
                <div
                  key={`${file.name}-${index}`}
                  className={`relative rounded-xl border bg-card overflow-hidden transition-all duration-300 ${
                    state?.status === "processing"
                      ? "border-amber-300 dark:border-amber-800 shadow-sm ring-1 ring-amber-200 dark:ring-amber-900"
                      : state?.status === "uploading"
                      ? "border-sky-300 dark:border-sky-800 shadow-sm ring-1 ring-sky-200 dark:ring-sky-900"
                      : state?.status === "done"
                      ? "border-emerald-200 dark:border-emerald-900"
                      : state?.status === "error"
                      ? "border-red-200 dark:border-red-900"
                      : "border-border hover:shadow-md"
                  }`}
                >
                  {/* Preview */}
                  <div className="relative aspect-square bg-muted">
                    {previewUrl ? (
                      isVideo ? (
                        <video
                          src={previewUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Video badge */}
                    {isVideo && (
                      <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        VIDEO
                      </div>
                    )}

                    {/* Remove button (only when not uploading) */}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow-lg transition-colors"
                      >
                        ×
                      </button>
                    )}

                    {/* Progress overlay during active upload */}
                    {state && (state.status === "processing" || state.status === "uploading") && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Spinner className="w-6 h-6 text-white" />
                        <span className="text-[10px] font-semibold text-white/90">{state.progress > 0 ? `${state.progress}%` : state.message}</span>
                      </div>
                    )}

                    {/* Done overlay */}
                    {state?.status === "done" && (
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-medium text-foreground truncate flex-1">{file.name}</p>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
                      {state && <StatusBadge status={state.status} />}
                    </div>

                    {/* Size comparison */}
                    {state?.status === "done" && state.originalSize && state.finalSize && (
                      <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground line-through">{formatBytes(state.originalSize)}</span>
                        <span className="text-[10px] font-semibold text-foreground">{formatBytes(state.finalSize)}</span>
                        <SavedBadge original={state.originalSize} final={state.finalSize} />
                        {state.passthrough && <PassthroughBadge />}
                      </div>
                    )}

                    {state?.status === "processing" && state.passthrough && (
                      <div className="pt-0.5">
                        <PassthroughBadge />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                {t("media.uploading")}
              </span>
            ) : (
              t("media.uploadFiles")
            )}
          </button>
        </div>
      )}
    </div>
  );
}
