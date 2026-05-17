import { Upload } from "@aws-sdk/lib-storage";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./client";

interface UploadOptions {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength?: number;
  onProgress?: (loaded: number, total: number) => void;
}

export async function uploadToR2({ key, body, contentType, contentLength, onProgress }: UploadOptions): Promise<string> {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
      ...(contentLength ? { ContentLength: contentLength } : {}),
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  });

  if (onProgress) {
    upload.on("httpUploadProgress", (progress) => {
      onProgress(progress.loaded ?? 0, progress.total ?? body.length);
    });
  }

  await upload.done();

  return `${R2_PUBLIC_URL}/${key}`;
}
