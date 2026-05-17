import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/services/r2/client";
import { extractKeyFromUrl } from "@/services/r2/url";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const key = extractKeyFromUrl(url);
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers = new Headers();
    if (response.ContentType) {
      headers.set("Content-Type", response.ContentType);
    }
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const body = response.Body as any;

    // Use native web stream if available (newer AWS SDK)
    if (typeof body.transformToWebStream === "function") {
      return new NextResponse(body.transformToWebStream(), {
        status: 200,
        headers,
      });
    }

    // Fallback: manual conversion from Node.js Readable to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        body.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        body.on("end", () => controller.close());
        body.on("error", (err: Error) => controller.error(err));
      },
      cancel() {
        body.destroy?.();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Failed to proxy media:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
