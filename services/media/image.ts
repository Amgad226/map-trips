import sharp from "sharp";

const MAX_WIDTH = 1920;
const THUMB_WIDTH = 400;
const WEBP_QUALITY = 80;
const THUMB_QUALITY = 70;

export interface ProcessedImage {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(buffer);

  const metadata = await pipeline.metadata();

  // Resize if wider than MAX_WIDTH
  const resized = pipeline.resize({
    width: Math.min(metadata.width || MAX_WIDTH, MAX_WIDTH),
    withoutEnlargement: true,
  });

  // Convert to WebP with quality optimization
  const webp = resized.webp({ quality: WEBP_QUALITY });

  const processedBuffer = await webp.toBuffer();

  // Generate thumbnail
  const thumbBuffer = await sharp(buffer)
    .resize({
      width: THUMB_WIDTH,
      withoutEnlargement: true,
    })
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
  };
}
