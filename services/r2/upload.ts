import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./client";

interface UploadOptions {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength?: number;
}

export async function uploadToR2({ key, body, contentType, contentLength }: UploadOptions): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: "public-read",
    ...(contentLength ? { ContentLength: contentLength } : {}),
  });

  await r2Client.send(command);

  return `${R2_PUBLIC_URL}/${key}`;
}
