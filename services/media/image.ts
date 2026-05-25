import sharp from "sharp";

const MAX_WIDTH = 1920;
const THUMB_WIDTH = 400;
const WEBP_QUALITY = 80;
const THUMB_QUALITY = 70;

export interface ProcessImageOptions {
  rotation?: "none" | "cw" | "ccw" | "180";
  compress?: boolean;
  quality?: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  passthrough?: boolean;
}

export async function processImage(
  buffer: Buffer,
  options?: ProcessImageOptions
): Promise<ProcessedImage> {
  const metadata = await sharp(buffer).metadata();

  const isSmall = buffer.length < 500 * 1024;
  const hasRotation = options?.rotation && options.rotation !== "none";
  const doCompress = options?.compress !== false; // default true

  // Passthrough: keep original if small or no edits requested
  if (isSmall || (!hasRotation && !doCompress)) {
    const thumbBuffer = await sharp(buffer)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    const format = metadata.format || "jpeg";
    const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;

    return {
      buffer,
      thumbnailBuffer: thumbBuffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
      mimeType,
      fileSize: buffer.length,
      passthrough: true,
    };
  }

  // Process image
  let pipeline = sharp(buffer);

  if (hasRotation) {
    switch (options!.rotation) {
      case "cw":
        pipeline = pipeline.rotate(90);
        break;
      case "ccw":
        pipeline = pipeline.rotate(270);
        break;
      case "180":
        pipeline = pipeline.rotate(180);
        break;
    }
  }

  const quality = options?.quality ?? WEBP_QUALITY;

  const processedBuffer = await pipeline
    .resize({
      width: Math.min(metadata.width || MAX_WIDTH, MAX_WIDTH),
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  // Thumbnail (also rotated if needed)
  let thumbPipeline = sharp(buffer);
  if (hasRotation) {
    switch (options!.rotation) {
      case "cw":
        thumbPipeline = thumbPipeline.rotate(90);
        break;
      case "ccw":
        thumbPipeline = thumbPipeline.rotate(270);
        break;
      case "180":
        thumbPipeline = thumbPipeline.rotate(180);
        break;
    }
  }

  const thumbBuffer = await thumbPipeline
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  const processedMeta = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    thumbnailBuffer: thumbBuffer,
    width: processedMeta.width || 0,
    height: processedMeta.height || 0,
    mimeType: "image/webp",
    fileSize: processedBuffer.length,
    passthrough: false,
  };
}
