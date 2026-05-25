import { spawn } from "child_process";
import { promises as fs } from "fs";
import path, { join } from "path";
import { randomUUID } from "crypto";

const TMP_DIR = path.join(process.cwd(), "uploads", "tmp");

export interface ProcessVideoOptions {
  cutStart?: number; // seconds to cut from start
  cutEnd?: number;   // seconds to cut from end
  rotation?: "none" | "cw" | "ccw" | "180";
  compress?: boolean;
  quality?: number;  // 0-100, default 70
}

export interface ProcessedVideo {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  mimeType: string;
  fileSize: number;
  originalSize: number;
  passthrough?: boolean;
  gpuUsed?: boolean;
  crf?: number;
  codec?: string;
}

interface VideoProbe {
  width: number;
  height: number;
  videoCodec: string;
  audioCodec?: string;
  duration?: number;
}

function resolveFfmpegPath(): string {
  return "ffmpeg";
}

function resolveFfprobePath(): string {
  return "ffprobe";
}

function runFfmpeg(args: string[], timeoutMs = 600000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfmpegPath(), args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    let killed = false;

    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            killed = true;
            proc.kill("SIGKILL");
            reject(new Error(`FFmpeg timed out after ${timeoutMs}ms`));
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
        reject(new Error(`FFmpeg exited with code ${code}\n${stderr}`));
      }
    });
  });
}

function probeVideo(inputPath: string): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfprobePath(), [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      inputPath,
    ]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", () => {
      try {
        const json = JSON.parse(stdout);
        const videoStream = json.streams.find(
          (s: any) => s.codec_type === "video"
        );
        const audioStream = json.streams.find(
          (s: any) => s.codec_type === "audio"
        );

        if (!videoStream) {
          reject(new Error("No video stream found"));
          return;
        }

        resolve({
          width: videoStream.width,
          height: videoStream.height,
          videoCodec: videoStream.codec_name,
          audioCodec: audioStream?.codec_name,
          duration: json.format?.duration
            ? parseFloat(json.format.duration)
            : undefined,
        });
      } catch (err) {
        reject(err);
      }
    });

    proc.on("error", reject);
  });
}

async function detectGpu(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if h264_nvenc encoder exists
    const proc = spawn(resolveFfmpegPath(), ["-encoders"]);
    let stdout = "";
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0 || !stdout.includes("h264_nvenc")) {
        resolve(false);
        return;
      }
      // Also check nvidia-smi
      const nvidia = spawn("nvidia-smi", []);
      nvidia.on("error", () => resolve(false));
      nvidia.on("close", (nCode) => resolve(nCode === 0));
    });
    proc.on("error", () => resolve(false));
  });
}

function getCrfFromQuality(quality: number): number {
  if (quality >= 80) return 18;
  if (quality >= 60) return 20;
  if (quality >= 40) return 23;
  return 28;
}

function getRotationFilter(rotation?: string): string | undefined {
  switch (rotation) {
    case "cw":
      return "transpose=1";
    case "ccw":
      return "transpose=2";
    case "180":
      return "transpose=2,transpose=2";
    default:
      return undefined;
  }
}

export async function processVideo(
  buffer: Buffer,
  options: ProcessVideoOptions = {},
  onEvent?: (event: string, percent: number) => void
): Promise<ProcessedVideo> {
  const id = randomUUID();
  const inputPath = join(TMP_DIR, `${id}-input`);
  const outputPath = join(TMP_DIR, `${id}.mp4`);
  const thumbPath = join(TMP_DIR, `${id}-thumb.jpg`);

  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
    await fs.writeFile(inputPath, buffer);

    onEvent?.("video:received", 5);
    onEvent?.("video:probing", 10);

    const probe = await probeVideo(inputPath);
    const duration = probe.duration ?? 0;

    onEvent?.("video:probed", 15);

    // Cutting logic
    const startCut = Math.max(0, options.cutStart ?? 0);
    const endCut = Math.max(0, options.cutEnd ?? 0);
    const endTime = duration > 0 ? Math.max(0, duration - endCut) : undefined;

    if (endTime !== undefined && endTime <= startCut) {
      throw new Error("Invalid cut range: start cut is greater than or equal to end cut");
    }

    onEvent?.("video:gpu-check", 20);
    const useGpu = await detectGpu();

    const hasRotation = !!options.rotation && options.rotation !== "none";
    const doCompress = options.compress === true;

    const reencode = hasRotation || doCompress;

    let codecArgs: string[] = [];
    let gpuUsed = false;
    let crf: number | undefined;

    if (!reencode) {
      // Lossless stream copy (original quality)
      codecArgs = ["-c", "copy"];
    } else {
      const quality = options.quality ?? 70;
      crf = getCrfFromQuality(quality);

      if (useGpu && doCompress) {
        // GPU encoding with compression
        gpuUsed = true;
        codecArgs = [
          "-c:v", "h264_nvenc",
          "-preset", "p1",
          "-cq", String(crf),
          "-c:a", "copy",
        ];
      } else {
        // CPU encoding
        if (doCompress) {
          codecArgs = [
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", String(crf),
            "-c:a", "copy",
          ];
        } else {
          // High quality (visually lossless) for rotation without compression
          codecArgs = [
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-c:a", "copy",
          ];
          crf = 18;
        }
      }
    }

    const filter = getRotationFilter(options.rotation);

    const args: string[] = ["-y", "-i", inputPath];

    if (startCut > 0) {
      args.push("-ss", String(startCut));
    }
    if (endTime !== undefined && endTime > 0) {
      args.push("-to", String(endTime));
    }

    if (filter) {
      args.push("-vf", filter);
    }

    args.push(...codecArgs);
    args.push("-movflags", "+faststart");
    args.push("-hide_banner", "-loglevel", "error");
    args.push(outputPath);

    if (!reencode) {
      onEvent?.("video:copying", 30);
    } else {
      onEvent?.("video:encoding", 30);
    }

    await runFfmpeg(args, 600000);

    const outputStat = await fs.stat(outputPath);
    const mainBuffer = await fs.readFile(outputPath);

    onEvent?.("video:encoded", 75);

    // Thumbnail
    onEvent?.("video:thumbnail", 85);
    const thumbSource = outputPath;
    const thumbSs = (duration && duration > 1) ? "00:00:01" : "00:00:00";
    await runFfmpeg([
      "-y",
      "-ss", thumbSs,
      "-i", thumbSource,
      "-vframes", "1",
      "-vf", "scale='if(gt(iw,400),400,iw)':-2",
      "-q:v", "2",
      thumbPath,
    ]);

    const thumbnailBuffer = await fs.readFile(thumbPath);

    onEvent?.("video:complete", 100);

    return {
      buffer: mainBuffer,
      thumbnailBuffer,
      mimeType: "video/mp4",
      fileSize: outputStat.size,
      originalSize: buffer.length,
      passthrough: !reencode,
      gpuUsed,
      crf,
      codec: gpuUsed ? "h264_nvenc" : "libx264",
    };
  } finally {
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
      fs.unlink(thumbPath).catch(() => {}),
    ]);
  }
}
