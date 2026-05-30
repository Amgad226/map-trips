import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { processImage, ProcessImageOptions } from "@/services/media/image";
import { processVideo, ProcessVideoOptions } from "@/services/media/video";
import { uploadToR2 } from "@/services/r2/upload";
import { slugify } from "@/lib/utils";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/avi",
  "video/x-msvideo",
];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

function validateFile(file: File) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error(`Invalid file type: ${file.type}`);
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    throw new Error(`File too large: ${file.name}`);
  }

  return { isImage, isVideo };
}

function getExtFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/avif") return "avif";
  if (mimeType === "video/mp4") return "mp4";
  const parts = mimeType.split("/");
  return parts[1] || "bin";
}

interface ProgressTracker {
  totalR2Bytes: number;
  loadedR2Bytes: number;
  editProgress: number;
  r2Progress: number;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }) + "\n", { status: 401 });
  }

  const formData = await request.formData();
  const tripIdRaw = formData.get("tripId");
  const tripId = tripIdRaw ? parseInt(tripIdRaw.toString(), 10) : NaN;

  if (isNaN(tripId)) {
    return new Response(JSON.stringify({ error: "Invalid tripId" }) + "\n", { status: 400 });
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    return new Response(JSON.stringify({ error: "Trip not found" }) + "\n", { status: 404 });
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    return new Response(JSON.stringify({ error: "No files provided" }) + "\n", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      }

      const folder = `${slugify(trip.title)}_${trip.id}`;
      const results = [];

      const tracker: ProgressTracker = {
        totalR2Bytes: 0,
        loadedR2Bytes: 0,
        editProgress: 0,
        r2Progress: 0,
      };

      function updateEditProgress(percent: number) {
        tracker.editProgress = Math.min(100, Math.max(0, percent));
      }

      function updateR2Progress() {
        if (tracker.totalR2Bytes === 0) {
          tracker.r2Progress = 0;
          return;
        }
        tracker.r2Progress = Math.min(
          100,
          Math.round((tracker.loadedR2Bytes / tracker.totalR2Bytes) * 100)
        );
      }

      function emit(
        event: string,
        message: string,
        opts?: {
          editPercent?: number;
          r2Loaded?: number;
          r2Total?: number;
          fileIndex?: number;
          fileName?: string;
          meta?: Record<string, unknown>;
        }
      ) {
        if (opts?.editPercent !== undefined) {
          updateEditProgress(opts.editPercent);
        }
        if (opts?.r2Loaded !== undefined && opts?.r2Total !== undefined) {
          tracker.loadedR2Bytes = opts.r2Loaded;
          tracker.totalR2Bytes = opts.r2Total;
          updateR2Progress();
        }
        send({
          phase: "event",
          event,
          message,
          editProgress: tracker.editProgress,
          r2Progress: tracker.r2Progress,
          fileIndex: opts?.fileIndex,
          fileName: opts?.fileName,
          meta: opts?.meta,
        });
      }

      // Parse options for all files
      let fileOptions: (ProcessImageOptions | ProcessVideoOptions | null)[] = [];
      try {
        const rawOpts = formData.get("fileOptions");
        if (rawOpts) {
          fileOptions = JSON.parse(rawOpts.toString());
        }
      } catch {
        // ignore
      }

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileIndex = i;
          const isLastFile = i === files.length - 1;
          const fileBaseProgress = (fileIndex / files.length) * 100;
          const nextFileBaseProgress = ((fileIndex + 1) / files.length) * 100;

          emit("file:start", `Processing ${file.name}...`, {
            editPercent: fileBaseProgress,
            fileIndex,
            fileName: file.name,
          });

          const { isImage } = validateFile(file);
          const buffer = Buffer.from(await file.arrayBuffer());

          emit("file:validated", `Validated ${file.name}`, {
            editPercent: fileBaseProgress + 2,
            fileIndex,
            fileName: file.name,
          });

          const opts = fileOptions[fileIndex] || undefined;

          // Process media
          const processed = isImage
            ? await processImage(buffer, opts as ProcessImageOptions)
            : await processVideo(
                buffer,
                opts as ProcessVideoOptions,
                (event, _percent) => {
                  const processingPercent = _percent;
                  const sliceSize = nextFileBaseProgress - fileBaseProgress - 5;
                  const mapped = fileBaseProgress + 5 + (processingPercent / 100) * sliceSize;
                  emit(event, `${file.name}: ${event}`, {
                    editPercent: mapped,
                    fileIndex,
                    fileName: file.name,
                    meta: { isVideo: true },
                  });
                }
              );

          emit("file:processed", `${file.name} processed`, {
            editPercent: nextFileBaseProgress,
            fileIndex,
            fileName: file.name,
            meta: {
              fileSize: processed.fileSize,
              fileSizeBeforeCompress: file.size,
              passthrough: (processed as { passthrough?: boolean }).passthrough,
              gpuUsed: (processed as { gpuUsed?: boolean }).gpuUsed,
              crf: (processed as { crf?: number }).crf,
            },
          });

          const uuid = randomUUID();
          const ext = getExtFromMimeType(processed.mimeType);
          const thumbExt = isImage ? "webp" : "jpg";

          const mediaKey = `${folder}/media/${uuid}.${ext}`;
          const thumbKey = `${folder}/thumbs/${uuid}.${thumbExt}`;

          // Calculate total R2 bytes for this file
          const r2Uploads: Array<{ key: string; body: Buffer; contentType: string }> = [
            { key: mediaKey, body: processed.buffer, contentType: processed.mimeType },
            { key: thumbKey, body: processed.thumbnailBuffer, contentType: isImage ? "image/webp" : "image/jpeg" },
          ];

          const fileR2Total = r2Uploads.reduce((sum, u) => sum + u.body.length, 0);
          let fileR2Loaded = 0;

          emit("r2:upload-start", `Uploading ${file.name} to R2...`, {
            r2Loaded: tracker.loadedR2Bytes,
            r2Total: tracker.totalR2Bytes + fileR2Total,
            fileIndex,
            fileName: file.name,
          });

          // Upload main file
          emit("r2:main-uploading", `Uploading main file (${file.name})...`, {
            fileIndex,
            fileName: file.name,
          });
          const url = await uploadToR2({
            key: mediaKey,
            body: processed.buffer,
            contentType: processed.mimeType,
            contentLength: processed.buffer.length,
            onProgress: (loaded, total) => {
              const currentLoaded = tracker.loadedR2Bytes - fileR2Loaded + loaded;
              emit("r2:main-progress", `Uploading main file: ${Math.round((loaded / total) * 100)}%`, {
                r2Loaded: currentLoaded,
                r2Total: tracker.totalR2Bytes,
                fileIndex,
                fileName: file.name,
              });
            },
          });
          fileR2Loaded += processed.buffer.length;
          emit("r2:main-done", `Main file uploaded (${file.name})`, {
            r2Loaded: tracker.loadedR2Bytes - fileR2Loaded + processed.buffer.length,
            r2Total: tracker.totalR2Bytes,
            fileIndex,
            fileName: file.name,
          });

          // Upload thumbnail
          emit("r2:thumb-uploading", `Uploading thumbnail (${file.name})...`, {
            fileIndex,
            fileName: file.name,
          });
          const thumbnailUrl = await uploadToR2({
            key: thumbKey,
            body: processed.thumbnailBuffer,
            contentType: isImage ? "image/webp" : "image/jpeg",
            contentLength: processed.thumbnailBuffer.length,
            onProgress: (loaded, total) => {
              const currentLoaded = tracker.loadedR2Bytes - fileR2Loaded + loaded;
              emit("r2:thumb-progress", `Uploading thumbnail: ${Math.round((loaded / total) * 100)}%`, {
                r2Loaded: currentLoaded,
                r2Total: tracker.totalR2Bytes,
                fileIndex,
                fileName: file.name,
              });
            },
          });
          fileR2Loaded += processed.thumbnailBuffer.length;
          emit("r2:thumb-done", `Thumbnail uploaded (${file.name})`, {
            r2Loaded: tracker.loadedR2Bytes - fileR2Loaded + processed.thumbnailBuffer.length,
            r2Total: tracker.totalR2Bytes,
            fileIndex,
            fileName: file.name,
          });

          emit("db:saving", `Saving ${file.name} to database...`, {
            editPercent: nextFileBaseProgress,
            fileIndex,
            fileName: file.name,
          });

          // Save to database
          const order = await prisma.media.count({ where: { tripId } });

          const stationIdRaw = formData.get("stationId");
          const stationId = stationIdRaw ? parseInt(stationIdRaw.toString(), 10) : undefined;

          const mediaRecord = await prisma.media.create({
            data: {
              tripId,
              stationId: stationId && !isNaN(stationId) ? stationId : undefined,
              type: isImage ? "IMAGE" : "VIDEO",
              url,
              thumbnailUrl,
              mimeType: processed.mimeType,
              fileSize: processed.fileSize,
              fileSizeBeforeCompress: file.size,
              order,
            },
          });

          emit("db:saved", `${file.name} saved to database`, {
            editPercent: nextFileBaseProgress,
            fileIndex,
            fileName: file.name,
          });

          emit("file:complete", `${file.name} completed`, {
            editPercent: nextFileBaseProgress,
            r2Loaded: tracker.loadedR2Bytes,
            r2Total: tracker.totalR2Bytes,
            fileIndex,
            fileName: file.name,
          });

          results.push(mediaRecord);

          if (!isLastFile) {
            emit("file:next", `Moving to next file...`, {
              editPercent: nextFileBaseProgress,
              fileIndex: fileIndex + 1,
            });
          }
        }

        emit("all:complete", "All files uploaded successfully!", {
          editPercent: 100,
          r2Loaded: tracker.loadedR2Bytes,
          r2Total: tracker.totalR2Bytes,
        });

        send({ phase: "done", progress: 100, results });
        controller.close();
      } catch (error: unknown) {
        emit("error", error instanceof Error ? error.message : "Upload failed", {
          editPercent: tracker.editProgress,
        });
        send({ phase: "error", progress: 0, message: error instanceof Error ? error.message : "Upload failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
