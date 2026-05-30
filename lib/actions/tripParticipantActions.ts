"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function addParticipantToTrip(tripId: number, participantId: number) {
  await requireAuth();

  await prisma.tripParticipant.create({
    data: { tripId, participantId },
  });

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath(`/trip/${tripId}`);
}

export async function removeParticipantFromTrip(tripId: number, participantId: number) {
  await requireAuth();

  await prisma.tripParticipant.deleteMany({
    where: { tripId, participantId },
  });

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath(`/trip/${tripId}`);
}

export async function setBestParticipant(tripId: number, participantId: number | null) {
  await requireAuth();

  // Unset any existing best for this trip
  await prisma.tripParticipant.updateMany({
    where: { tripId, isBest: true },
    data: { isBest: false },
  });

  // Set new best if provided
  if (participantId !== null) {
    await prisma.tripParticipant.updateMany({
      where: { tripId, participantId },
      data: { isBest: true },
    });
  }

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath(`/trip/${tripId}`);
}
