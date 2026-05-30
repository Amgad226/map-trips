"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { processImage } from "@/services/media/image";
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
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const participantSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});

async function processParticipantImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: images only.`);
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`File too large: ${file.name}. Max 20MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buffer, { compress: true, quality: 80 });

  const uuid = randomUUID();
  const ext = processed.mimeType === "image/jpeg" ? "jpg" : "webp";
  const key = `participants/${uuid}.${ext}`;

  const url = await uploadToR2({
    key,
    body: processed.buffer,
    contentType: processed.mimeType,
    contentLength: processed.buffer.length,
  });

  return url;
}

export async function createParticipant(formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = participantSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  let imageUrl: string | undefined;
  const file = formData.get("imageFile") as File | null;
  if (file && file.size > 0) {
    imageUrl = await processParticipantImage(file);
  }

  const participant = await prisma.participant.create({
    data: {
      name: parsed.data.name,
      image: imageUrl,
    },
  });

  revalidatePath("/admin/participants");
  redirect("/admin/participants");
}

export async function updateParticipant(id: number, formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = participantSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  const existing = await prisma.participant.findUnique({ where: { id } });
  if (!existing) throw new Error("Participant not found");

  let imageUrl: string | undefined | null = existing.image;
  const file = formData.get("imageFile") as File | null;
  if (file && file.size > 0) {
    // Delete old image from R2
    if (existing.image) {
      try {
        await deleteFromR2(extractKeyFromUrl(existing.image));
      } catch {
        // ignore
      }
    }
    imageUrl = await processParticipantImage(file);
  }

  await prisma.participant.update({
    where: { id },
    data: {
      name: parsed.data.name,
      image: imageUrl,
    },
  });

  revalidatePath("/admin/participants");
}

export async function deleteParticipant(id: number) {
  await requireAuth();

  const participant = await prisma.participant.findUnique({ where: { id } });
  if (!participant) throw new Error("Participant not found");

  // Delete image from R2
  if (participant.image) {
    try {
      await deleteFromR2(extractKeyFromUrl(participant.image));
    } catch {
      // ignore
    }
  }

  await prisma.participant.delete({ where: { id } });

  revalidatePath("/admin/participants");
}
