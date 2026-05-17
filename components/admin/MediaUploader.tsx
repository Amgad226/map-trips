"use client";

import { useState, useTransition, useCallback } from "react";

interface MediaUploaderProps {
  tripId: string;
  action: (formData: FormData) => Promise<unknown>;
}

export default function MediaUploader({ tripId, action }: MediaUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileList = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileList]);

    // Generate previews for images
    const newPreviews = new Map(previews);
    fileList.forEach((file) => {
      if (file.type.startsWith("image/")) {
        newPreviews.set(file.name, URL.createObjectURL(file));
      }
    });
    setPreviews(newPreviews);
    setError("");
  }, [previews]);

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

  async function handleUpload() {
    if (files.length === 0) return;
    setError("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    startTransition(async () => {
      try {
        await action(formData);
        // Clear files after successful upload
        previews.forEach((url) => URL.revokeObjectURL(url));
        setFiles([]);
        setPreviews(new Map());
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Upload failed");
        }
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
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
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-500">
              Images up to 20MB, videos up to 500MB
            </p>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {files.length} file{files.length > 1 ? "s" : ""} selected
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative rounded-lg border border-gray-200 bg-white p-2"
              >
                {previews.get(file.name) ? (
                  <img
                    src={previews.get(file.name)}
                    alt={file.name}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center bg-gray-100 rounded-md">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                      />
                    </svg>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-600 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Uploading..." : "Upload Files"}
          </button>
        </div>
      )}
    </div>
  );
}
