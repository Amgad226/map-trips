import { spawn } from "child_process";
import { existsSync } from "fs";
import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import ffmpegStaticPath from "ffmpeg-static";

const TMP_DIR = "./uploads/tmp";

export interface ProcessedVideo {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  mimeType: string;
  fileSize: number;
}

function resolveFfmpegPath(): string {
  // Prefer the bundled static binary if it exists
  if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
    return ffmpegStaticPath;
  }
  // Fall back to system ffmpeg in PATH
  return "ffmpeg";
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = resolveFfmpegPath();
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function processVideo(buffer: Buffer): Promise<ProcessedVideo> {
  const id = randomUUID();
  const inputPath = join(TMP_DIR, `${id}-input`);
  const outputPath = join(TMP_DIR, `${id}.mp4`);
  const thumbPath = join(TMP_DIR, `${id}-thumb.jpg`);

  try {
    // Write input buffer to temp file
    await fs.writeFile(inputPath, buffer);

    // Convert to MP4 H.264 with web streaming optimization
    await runFfmpeg([
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-vf", "scale='trunc(min(1920,iw)/2)*2:-2'",
      outputPath,
    ]);

    // Generate thumbnail — use input-seeking (-ss before -i) for reliable frame extraction
    let thumbGenerated = false;
    for (const seekTime of ["00:00:01", "00:00:00"]) {
      try {
        await runFfmpeg([
          "-y",
          "-ss", seekTime,
          "-i", outputPath,
          "-vframes", "1",
          "-vf", "scale='trunc(400/2)*2:-2'",
          "-q:v", "2",
          thumbPath,
        ]);
        if (existsSync(thumbPath)) {
          thumbGenerated = true;
          break;
        }
      } catch {
        // Try next seek time
      }
    }

    if (!thumbGenerated) {
      throw new Error("Failed to generate thumbnail from video");
    }

    // Read outputs into buffers
    const [videoBuffer, thumbBuffer] = await Promise.all([
      fs.readFile(outputPath),
      fs.readFile(thumbPath),
    ]);

    return {
      buffer: videoBuffer,
      thumbnailBuffer: thumbBuffer,
      mimeType: "video/mp4",
      fileSize: videoBuffer.length,
    };
  } finally {
    // Clean up temp files
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
      fs.unlink(thumbPath).catch(() => {}),
    ]);
  }
}
