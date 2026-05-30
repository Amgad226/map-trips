"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

interface MediaUploaderProps {
  tripId: number;
  stations?: { id: number; name: string }[];
}

interface UploadEvent {
  id: number;
  event: string;
  message: string;
  timestamp: string;
}

interface FileUploadState {
  name: string;
  size: number;
  type: string;
  status: "queued" | "processing" | "uploading" | "done" | "error";
  message: string;
  uploadPercent: number;
  editPercent: number;
  r2Percent: number;
  finalSize?: number;
  originalSize?: number;
  passthrough?: boolean;
  gpuUsed?: boolean;
  crf?: number;
}

interface PerFileOptions {
  rotation: "none" | "cw" | "ccw" | "180";
  compress: boolean;
  quality: number;
  cutStart: number;
  cutEnd: number;
}

function defaultOptions(): PerFileOptions {
  return {
    rotation: "none",
    compress: true,
    quality: 70,
    cutStart: 0,
    cutEnd: 0,
  };
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
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

function MiniBar({ label, percent, colorClass }: { label: string; percent: number; colorClass: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function MediaUploader({ tripId, stations = [] }: MediaUploaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [stationId, setStationId] = useState<string>("");
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [events, setEvents] = useState<UploadEvent[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set());
  const [fileOptions, setFileOptions] = useState<PerFileOptions[]>([]);
  const eventIdRef = useRef(0);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileList = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileList]);
    setFileOptions((prev) => [...prev, ...fileList.map(() => defaultOptions())]);

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
    setFileOptions((prev) => prev.filter((_, i) => i !== index));
    setExpandedOptions((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  }

  function updateFileOption(index: number, patch: Partial<PerFileOptions>) {
    setFileOptions((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] ?? defaultOptions()), ...patch };
      return next;
    });
  }

  function addEvent(prev: UploadEvent[], event: string, message: string): UploadEvent[] {
    const id = ++eventIdRef.current;
    return [...prev, {
      id,
      event,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    }];
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
    if (event === "video:probing") return "Analyzing...";
    if (event === "video:gpu-check") return "GPU check...";
    if (event === "video:copying") return "Copying...";
    if (event === "video:encoding") return "Encoding...";
    if (event === "video:encoded") return "Encoded";
    if (event === "video:thumbnail") return "Thumbnail...";
    if (event.startsWith("r2:")) return "Cloud...";
    if (event === "file:processed") return "Ready";
    if (event === "db:saving") return "Saving...";
    return defaultMsg;
  }

  function computeFilePercent(fileIndex: number, totalFiles: number, globalPercent: number): number {
    if (totalFiles === 0) return 0;
    const slice = 100 / totalFiles;
    const fileStart = fileIndex * slice;
    const fileEnd = fileStart + slice;
    if (globalPercent <= fileStart) return 0;
    if (globalPercent >= fileEnd) return 100;
    return Math.round(((globalPercent - fileStart) / slice) * 100);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    eventIdRef.current = 0;
    setEvents([]);
    setShowLog(false);

    const totalFiles = files.length;

    const initialStates: FileUploadState[] = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      status: "queued",
      message: "Waiting...",
      uploadPercent: 0,
      editPercent: 0,
      r2Percent: 0,
      originalSize: f.size,
    }));
    setFileStates(initialStates);

    const formData = new FormData();
    formData.append("tripId", tripId.toString());
    if (stationId) formData.append("stationId", stationId);
    files.forEach((file) => formData.append("files", file));
    const optsArray = files.map((_, i) => fileOptions[i] ?? defaultOptions());
    formData.append("fileOptions", JSON.stringify(optsArray));

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Accept", "application/x-ndjson");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFileStates((prev) => prev.map((s) => ({
            ...s,
            uploadPercent: pct,
            status: pct < 100 ? (s.status === "queued" ? "processing" : s.status) : s.status,
          })));
        }
      };

      let lastParsedIndex = 0;
      let globalUploadDone = false;

      function processChunk(isFinal: boolean) {
        const text = xhr.responseText;
        const chunk = text.substring(lastParsedIndex);
        const lines = chunk.split("\n");
        const completeLines = isFinal ? lines : lines.slice(0, -1);

        for (const line of completeLines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.phase === "error") {
              reject(new Error(data.message || "Upload failed"));
              return;
            }
            if (data.phase === "done") {
              setFileStates((prev) =>
                prev.map((s) => ({
                  ...s,
                  uploadPercent: 100,
                  editPercent: 100,
                  r2Percent: 100,
                  status: s.status !== "error" ? "done" : s.status,
                  message: s.status !== "error" ? "Complete" : s.message,
                }))
              );
            } else if (data.phase === "event") {
              const idx = typeof data.fileIndex === "number" ? data.fileIndex : -1;
              const evt = data.event as string;
              const msg = data.message as string;
              const globalEdit = data.editProgress ?? 0;
              const globalR2 = data.r2Progress ?? 0;

              if (!globalUploadDone && (data.uploadProgress >= 100 || globalEdit > 0 || globalR2 > 0)) {
                globalUploadDone = true;
              }

              setEvents((prev) => addEvent(prev, evt, msg));

              setFileStates((prev) => {
                const next = [...prev];
                const total = next.length;

                for (let i = 0; i < total; i++) {
                  const state = { ...next[i] };

                  // Upload: shared across all files
                  if (globalUploadDone || state.uploadPercent > 0) {
                    state.uploadPercent = Math.max(state.uploadPercent, 100);
                  }

                  // Edit: slice per file
                  state.editPercent = computeFilePercent(i, total, globalEdit);

                  // R2: slice per file
                  state.r2Percent = computeFilePercent(i, total, globalR2);

                  // Status & message for the active file
                  if (i === idx) {
                    state.status = getStatusFromEvent(evt);
                    state.message = getMessageFromEvent(evt, msg);

                    if (evt === "file:processed" && data.meta) {
                      state.finalSize = data.meta.fileSize as number;
                      state.originalSize = data.meta.fileSizeBeforeCompress as number;
                      state.passthrough = data.meta.passthrough as boolean;
                      state.gpuUsed = data.meta.gpuUsed as boolean;
                      state.crf = data.meta.crf as number;
                    }
                  } else if (state.status === "queued" && state.uploadPercent > 0) {
                    state.status = "processing";
                  }

                  next[i] = state;
                }
                return next;
              });
            }
          } catch {
            // ignore malformed or incomplete lines
          }
        }

        if (!isFinal) {
          lastParsedIndex = text.length - lines[lines.length - 1].length;
        }
      }

      xhr.onprogress = () => processChunk(false);

      xhr.onload = () => {
        processChunk(true);
        if (xhr.status >= 200 && xhr.status < 300) {
          setFileStates((prev) =>
            prev.map((s) => ({
              ...s,
              uploadPercent: 100,
              editPercent: 100,
              r2Percent: 100,
              status: s.status !== "error" ? "done" : s.status,
              message: s.status !== "error" ? "Complete" : s.message,
            }))
          );
          previews.forEach((url) => URL.revokeObjectURL(url));
          setFiles([]);
          setPreviews(new Map());
          router.refresh();
          resolve();
        } else {
          reject(new Error(xhr.statusText || "Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.onabort = () => reject(new Error("Upload aborted"));

      xhr.send(formData);
    }).catch((err: unknown) => {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("media.uploadFailed"));
      }
      setFileStates((prev) => prev.map((s) => (s.status !== "done" ? { ...s, status: "error", message: "Failed" } : s)));
    }).finally(() => {
      setUploading(false);
      setTimeout(() => {
        setFileStates([]);
        setEvents([]);
      }, 6000);
    });
  }

  function renderOptionsPanel(file: File, index: number) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const isSmallImage = isImage && file.size < 500 * 1024;
    const opts = fileOptions[index] ?? defaultOptions();

    if (isSmallImage) {
      return (
        <div className="pt-1">
          <span className="text-[10px] text-muted-foreground">Small image — no edits</span>
        </div>
      );
    }

    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() =>
            setExpandedOptions((prev) => {
              const next = new Set(prev);
              if (next.has(index)) next.delete(index);
              else next.add(index);
              return next;
            })
          }
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expandedOptions.has(index) ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {expandedOptions.has(index) ? "Hide options" : "Edit options"}
        </button>

        {expandedOptions.has(index) && (
          <div className="mt-1.5 space-y-2 p-2 rounded-lg bg-muted/50 border border-border/50">
            {isVideo && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Cut start (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={opts.cutStart}
                    onChange={(e) => updateFileOption(index, { cutStart: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full text-[10px] px-1.5 py-1 rounded border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Cut end (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={opts.cutEnd}
                    onChange={(e) => updateFileOption(index, { cutEnd: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full text-[10px] px-1.5 py-1 rounded border border-border bg-background"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Rotation</label>
              <select
                value={opts.rotation}
                onChange={(e) => updateFileOption(index, { rotation: e.target.value as PerFileOptions["rotation"] })}
                className="w-full text-[10px] px-1.5 py-1 rounded border border-border bg-background"
              >
                <option value="none">No rotation</option>
                <option value="cw">90° clockwise</option>
                <option value="ccw">90° counterclockwise</option>
                <option value="180">180°</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Compress</label>
              <button
                type="button"
                onClick={() => updateFileOption(index, { compress: !opts.compress })}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  opts.compress ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                    opts.compress ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {opts.compress && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-muted-foreground">Quality</label>
                  <span className="text-[10px] font-semibold tabular-nums bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{opts.quality}%</span>
                </div>
                <div className="relative h-4 flex items-center">
                  <div className="absolute inset-x-0 h-[3px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((opts.quality - 20) / 70) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={10}
                    value={opts.quality}
                    onChange={(e) => updateFileOption(index, { quality: parseInt(e.target.value, 10) })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm pointer-events-none transition-all"
                    style={{ left: `calc(${((opts.quality - 20) / 70) * 100}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                  <span>Smaller</span>
                  <span>Better</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const activeCount = fileStates.filter((s) => s.status === "processing" || s.status === "uploading").length;
  const doneCount = fileStates.filter((s) => s.status === "done").length;

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

      {/* Station select */}
      {stations.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">{t("media.station")}</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="">{t("media.noStation")}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-4">
          {/* Global status header */}
          {uploading && (
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeCount > 0 ? (
                    <Spinner className="w-4 h-4 text-primary" />
                  ) : doneCount > 0 ? (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                  <p className="text-sm font-semibold text-foreground">
                    {doneCount === files.length && doneCount > 0
                      ? t("upload.complete")
                      : `${doneCount}/${files.length} done`}
                  </p>
                </div>
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
              const isImage = file.type.startsWith("image/");
              const previewUrl = previews.get(file.name);
              const isActive = state && (state.status === "processing" || state.status === "uploading");
              const isDone = state?.status === "done";
              const isError = state?.status === "error";

              return (
                <div
                  key={`${file.name}-${index}`}
                  className={`relative rounded-xl border bg-card overflow-hidden transition-all duration-300 ${
                    isActive
                      ? "border-amber-300 dark:border-amber-800 shadow-sm ring-1 ring-amber-200 dark:ring-amber-900"
                      : isDone
                      ? "border-emerald-200 dark:border-emerald-900"
                      : isError
                      ? "border-red-200 dark:border-red-900"
                      : "border-border hover:shadow-md"
                  }`}
                >
                  {/* Preview */}
                  <div className="relative aspect-square bg-muted">
                    {previewUrl ? (
                      isVideo ? (
                        <video src={previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                      ) : (
                        <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      </div>
                    )}

                    {isVideo && (
                      <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        VIDEO
                      </div>
                    )}
                    {isImage && file.size < 500 * 1024 && (
                      <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        SMALL
                      </div>
                    )}

                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow-lg transition-colors"
                      >
                        ×
                      </button>
                    )}

                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5">
                        <Spinner className="w-6 h-6 text-white" />
                        <span className="text-[10px] font-semibold text-white/90">{state.message}</span>
                      </div>
                    )}

                    {isDone && (
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

                    {/* Per-file progress bars */}
                    {uploading && state && (
                      <div className="space-y-1 pt-0.5">
                        <MiniBar label="Upload" percent={state.uploadPercent} colorClass="bg-primary" />
                        <MiniBar label="Edit" percent={state.editPercent} colorClass="bg-amber-500" />
                        <MiniBar label="Cloud" percent={state.r2Percent} colorClass="bg-emerald-500" />
                      </div>
                    )}

                    {/* Size comparison */}
                    {isDone && state.originalSize && state.finalSize && (
                      <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground line-through">{formatBytes(state.originalSize)}</span>
                        <span className="text-[10px] font-semibold text-foreground">{formatBytes(state.finalSize)}</span>
                        <SavedBadge original={state.originalSize} final={state.finalSize} />
                        {state.passthrough && <PassthroughBadge />}
                      </div>
                    )}

                    {isActive && state.passthrough && (
                      <div className="pt-0.5">
                        <PassthroughBadge />
                      </div>
                    )}
                    {isDone && state.gpuUsed && (
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-900">
                          GPU
                        </span>
                        {state.crf !== undefined && (
                          <span className="text-[10px] text-muted-foreground">CRF {state.crf}</span>
                        )}
                      </div>
                    )}

                    {/* Options panel */}
                    {(isVideo || (isImage && file.size >= 500 * 1024)) && !uploading && renderOptionsPanel(file, index)}
                    {isImage && file.size < 500 * 1024 && !uploading && (
                      <div className="pt-1">
                        <span className="text-[10px] text-muted-foreground">Small image — no edits</span>
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
