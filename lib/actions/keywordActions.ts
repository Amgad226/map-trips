"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const MAX_KEYWORD_LENGTH = 30;
const MAX_KEYWORDS_PER_TRIP = 20;

export async function addKeyword(tripId: number, value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Keyword cannot be empty");
  }

  if (normalized.length > MAX_KEYWORD_LENGTH) {
    throw new Error(`Keyword too long (max ${MAX_KEYWORD_LENGTH} characters)`);
  }

  const existingCount = await prisma.keyword.count({
    where: { tripId },
  });

  if (existingCount >= MAX_KEYWORDS_PER_TRIP) {
    throw new Error(`Maximum ${MAX_KEYWORDS_PER_TRIP} keywords per trip`);
  }

  try {
    await prisma.keyword.create({
      data: {
        tripId,
        value: normalized,
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("Keyword already exists for this trip");
    }
    throw error;
  }

  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/");
}

export async function removeKeyword(keywordId: number, tripId: number) {
  await prisma.keyword.delete({
    where: { id: keywordId },
  });

  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/");
}
