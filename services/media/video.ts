import { spawn } from "child_process";
import { existsSync } from "fs";
import { promises as fs } from "fs";
import path, { join } from "path";
import { randomUUID } from "crypto";
import ffmpegStaticPath from "ffmpeg-static";

const TMP_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", "tmp");

export interface ProcessedVideo {
  buffer: Buffer;
  buffer360p?: Buffer;
  buffer720p?: Buffer;
  thumbnailBuffer: Buffer;
  mimeType: string;
  fileSize: number;
  passthrough?: boolean;
  originalSize: number;
}

function resolveFfmpegPath(): string {
  if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
    return ffmpegStaticPath;
  }
  return "ffmpeg";
}

function runFfmpeg(args: string[], timeoutMs = 600000): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = resolveFfmpegPath();
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let killed = false;

    const timer = timeoutMs > 0
      ? setTimeout(() => {
          killed = true;
          proc.kill("SIGKILL");
          reject(new Error("FFmpeg timed out after " + timeoutMs + "ms"));
        }, timeoutMs)
      : null;

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (killed) return;
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
  });
}

function getScaleFilter(height: number): string {
  return `scale='trunc(min(${height},iw)/2)*2:-2'`;
}

interface VideoProbe {
  width: number;
  height: number;
  videoCodec: string;
  audioCodec?: string;
  duration?: number;
}

function probeVideo(inputPath: string): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = resolveFfmpegPath();
    const proc = spawn(ffmpegPath, ["-i", inputPath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", () => {
      // ffmpeg exits with code 1 when using -i without output — this is expected
      const videoMatch = stderr.match(/Stream #\d+:\d+(?:\[\w+\])?(?:\(\w+\))?: Video:\s*(\w+)/);
      const audioMatch = stderr.match(/Stream #\d+:\d+(?:\[\w+\])?(?:\(\w+\))?: Audio:\s*(\w+)/);
      const dimMatch = stderr.match(/,\s*(\d+)x(\d+)[,\s]/);
      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);

      if (!videoMatch || !dimMatch) {
        reject(new Error("Could not probe video format"));
        return;
      }

      const width = parseInt(dimMatch[1], 10);
      const height = parseInt(dimMatch[2], 10);
      const duration = durationMatch
        ? parseInt(durationMatch[1], 10) * 3600 +
          parseInt(durationMatch[2], 10) * 60 +
          parseFloat(durationMatch[3])
        : undefined;

      resolve({
        width,
        height,
        videoCodec: videoMatch[1],
        audioCodec: audioMatch ? audioMatch[1] : undefined,
        duration,
      });
    });

    proc.on("error", (err) => reject(err));
  });
}

async function tryPassthrough(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    await runFfmpeg(
      ["-y", "-i", inputPath, "-c", "copy", "-movflags", "+faststart", outputPath],
      120000
    );
    const inputStat = await fs.stat(inputPath);
    const outputStat = await fs.stat(outputPath);
    // Allow 15% overhead for moov atom movement / remuxing
    return outputStat.size <= inputStat.size * 1.15;
  } catch {
    return false;
  }
}

export async function processVideo(
  buffer: Buffer,
  onEvent?: (event: string, percent: number) => void
): Promise<ProcessedVideo> {
  const id = randomUUID();
  const inputPath = join(TMP_DIR, `${id}-input`);
  const outputPath = join(TMP_DIR, `${id}.mp4`);
  const output360Path = join(TMP_DIR, `${id}-360p.mp4`);
  const output720Path = join(TMP_DIR, `${id}-720p.mp4`);
  const thumbPath = join(TMP_DIR, `${id}-thumb.jpg`);

  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
    await fs.writeFile(inputPath, buffer);

    onEvent?.("video:received", 5);

    // Probe input
    onEvent?.("video:probing", 8);
    const probe = await probeVideo(inputPath);
    onEvent?.("video:probed", 12);

    const isH264 = probe.videoCodec.toLowerCase().startsWith("h264");
    const isAac = !probe.audioCodec || probe.audioCodec.toLowerCase().startsWith("aac");
    const canPassthrough = isH264 && isAac;

    let mainBuffer: Buffer;
    let buffer360p: Buffer | undefined;
    let buffer720p: Buffer | undefined;
    let passthroughUsed = false;

    const needs720p = probe.width > 720 || probe.height > 720;
    const needs360p = probe.width > 480 || probe.height > 480;
    const needsLowerQualities = needs720p || needs360p;

    if (canPassthrough) {
      onEvent?.("video:passthrough-try", 15);
      const success = await tryPassthrough(inputPath, outputPath);

      if (success) {
        passthroughUsed = true;
        mainBuffer = await fs.readFile(outputPath);
        onEvent?.("video:passthrough-done", 40);

        if (needsLowerQualities) {
          onEvent?.("video:lower-encoding", 45);

          const scale720 = getScaleFilter(720);
          const scale360 = getScaleFilter(360);

          // Build dynamic filter_complex and maps based on what we actually need
          const filters: string[] = [];
          const args: string[] = ["-y", "-i", inputPath];

          if (needs720p && needs360p) {
            filters.push(`[0:v]split=2[v1][v2]; [v1]${scale720}[v1out]; [v2]${scale360}[v2out]`);
            args.push(
              "-filter_complex", filters[0],
              "-map", "[v1out]", "-map", "0:a:0?",
              "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
              "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
              output720Path,
              "-map", "[v2out]", "-map", "0:a:0?",
              "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
              "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
              output360Path
            );
          } else if (needs720p) {
            filters.push(`[0:v]${scale720}[v1out]`);
            args.push(
              "-filter_complex", filters[0],
              "-map", "[v1out]", "-map", "0:a:0?",
              "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
              "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
              output720Path
            );
          } else {
            // needs360p only
            filters.push(`[0:v]${scale360}[v1out]`);
            args.push(
              "-filter_complex", filters[0],
              "-map", "[v1out]", "-map", "0:a:0?",
              "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
              "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
              output360Path
            );
          }

          await runFfmpeg(args, 600000);

          if (needs720p) {
            buffer720p = await fs.readFile(output720Path).catch(() => undefined);
          }
          if (needs360p) {
            buffer360p = await fs.readFile(output360Path).catch(() => undefined);
          }
          onEvent?.("video:lower-done", 70);
        }
      }
    }

    if (!passthroughUsed) {
      onEvent?.("video:full-encoding", 15);

      const scaleMain = getScaleFilter(1080);
      const scale720 = getScaleFilter(720);
      const scale360 = getScaleFilter(360);

      await runFfmpeg(
        [
          "-y", "-i", inputPath,
          "-filter_complex",
          `[0:v]split=3[v1][v2][v3]; [v1]${scaleMain}[v1out]; [v2]${scale720}[v2out]; [v3]${scale360}[v3out]`,
          "-map", "[v1out]", "-map", "0:a:0?",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
          outputPath,
          "-map", "[v2out]", "-map", "0:a:0?",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
          output720Path,
          "-map", "[v3out]", "-map", "0:a:0?",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
          output360Path,
        ],
        600000
      );

      onEvent?.("video:full-done", 65);

      [mainBuffer, buffer720p, buffer360p] = await Promise.all([
        fs.readFile(outputPath),
        fs.readFile(output720Path).catch(() => undefined),
        fs.readFile(output360Path).catch(() => undefined),
      ]);
    }

    // Generate thumbnail from the best source (passthrough = original, otherwise = re-encoded)
    onEvent?.("video:thumbnail-encoding", 85);
    const thumbSource = passthroughUsed ? inputPath : outputPath;
    let thumbGenerated = false;
    for (const seekTime of ["00:00:01", "00:00:00"]) {
      try {
        await runFfmpeg([
          "-y",
          "-ss", seekTime,
          "-i", thumbSource,
          "-vframes", "1",
          "-vf", "scale='trunc(min(400,iw)/2)*2:-2'",
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
    onEvent?.("video:thumbnail-done", 95);

    onEvent?.("video:reading", 97);
    const thumbBuffer = await fs.readFile(thumbPath);

    onEvent?.("video:complete", 100);

    return {
      buffer: mainBuffer!,
      buffer360p,
      buffer720p,
      thumbnailBuffer: thumbBuffer,
      mimeType: "video/mp4",
      fileSize: mainBuffer!.length,
      passthrough: passthroughUsed,
      originalSize: buffer.length,
    };
  } finally {
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
      fs.unlink(output360Path).catch(() => {}),
      fs.unlink(output720Path).catch(() => {}),
      fs.unlink(thumbPath).catch(() => {}),
    ]);
  }
}
