"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { processImage, ProcessImageOptions } from "@/services/media/image";
import { processVideo, ProcessVideoOptions } from "@/services/media/video";
import { uploadToR2 } from "@/services/r2/upload";
import { deleteFromR2 } from "@/services/r2/delete";
import { extractKeyFromUrl } from "@/services/r2/url";
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
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

function validateFile(file: File) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: images and videos.`);
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    throw new Error(
      `File too large: ${file.name}. Max ${isImage ? "20MB" : "500MB"}.`
    );
  }

  return { isImage, isVideo };
}

export async function uploadMedia(tripId: number, formData: FormData) {
  await requireAuth();

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    throw new Error("Trip not found");
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    throw new Error("No files provided");
  }

  const folder = `${slugify(trip.title)}_${trip.id}`;
  const results = [];

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

  // Parse file options if provided
  let fileOptions: (ProcessImageOptions | ProcessVideoOptions | null)[] = [];
  try {
    const rawOpts = formData.get("fileOptions");
    if (rawOpts) {
      fileOptions = JSON.parse(rawOpts.toString());
    }
  } catch {
    // ignore
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { isImage } = validateFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    const opts = fileOptions[i] || undefined;

    // Process media
    const processed = isImage
      ? await processImage(buffer, opts as ProcessImageOptions)
      : await processVideo(buffer, opts as ProcessVideoOptions);

    // Upload to R2
    const uuid = randomUUID();
    const ext = getExtFromMimeType(processed.mimeType);
    const thumbExt = isImage ? "webp" : "jpg";

    const mediaKey = `${folder}/media/${uuid}.${ext}`;
    const thumbKey = `${folder}/thumbs/${uuid}.${thumbExt}`;

    const [url, thumbnailUrl] = await Promise.all([
      uploadToR2({
        key: mediaKey,
        body: processed.buffer,
        contentType: processed.mimeType,
        contentLength: processed.buffer.length,
      }),
      uploadToR2({
        key: thumbKey,
        body: processed.thumbnailBuffer,
        contentType: isImage ? "image/webp" : "image/jpeg",
        contentLength: processed.thumbnailBuffer.length,
      }),
    ]);

    // Save to database
    const order = await prisma.media.count({ where: { tripId } });

    const media = await prisma.media.create({
      data: {
        tripId,
        type: isImage ? "IMAGE" : "VIDEO",
        url,
        thumbnailUrl,
        mimeType: processed.mimeType,
        fileSize: processed.fileSize,
        fileSizeBeforeCompress: file.size,
        order,
      },
    });

    results.push(media);
  }

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/");

  return results;
}

export async function deleteMedia(mediaId: number) {
  await requireAuth();

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error("Media not found");
  }

  // Delete from R2
  try {
    await deleteFromR2(extractKeyFromUrl(media.url));
    if (media.thumbnailUrl) {
      await deleteFromR2(extractKeyFromUrl(media.thumbnailUrl));
    }
  } catch (e) {
    console.error("Failed to delete from R2:", e);
  }

  // Delete from database
  await prisma.media.delete({ where: { id: mediaId } });

  revalidatePath(`/admin/trips/${media.tripId}`);
  revalidatePath(`/trip/${media.tripId}`);
  revalidatePath("/");
}

export async function reorderMedia(tripId: number, mediaIds: number[]) {
  await requireAuth();

  await Promise.all(
    mediaIds.map((id, index) =>
      prisma.media.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath(`/trip/${tripId}`);
}

export async function setCoverImage(tripId: number, coverImage: string | null) {
  await requireAuth();

  await prisma.trip.update({
    where: { id: tripId },
    data: { coverImage },
  });

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/");
}

export async function toggleMediaFlag(mediaId: number) {
  await requireAuth();

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error("Media not found");
  }

  await prisma.media.update({
    where: { id: mediaId },
    data: { isFlagged: !media.isFlagged },
  });

  revalidatePath(`/admin/trips/${media.tripId}`);
  revalidatePath(`/trip/${media.tripId}`);
}
