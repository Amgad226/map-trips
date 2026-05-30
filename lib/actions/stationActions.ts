"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const stationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export async function createStation(tripId: number, formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = stationSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  const order = await prisma.station.count({ where: { tripId } });

  const station = await prisma.station.create({
    data: {
      ...parsed.data,
      tripId,
      order,
    },
  });

  revalidatePath("/");
  revalidatePath(`/trip/${tripId}`);
  revalidatePath(`/admin/trips/${tripId}`);

  return station;
}

export async function updateStation(stationId: number, formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = stationSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  const station = await prisma.station.update({
    where: { id: stationId },
    data: parsed.data,
  });

  revalidatePath("/");
  revalidatePath(`/trip/${station.tripId}`);
  revalidatePath(`/admin/trips/${station.tripId}`);

  return station;
}

export async function deleteStation(stationId: number) {
  await requireAuth();

  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    throw new Error("Station not found");
  }

  await prisma.station.delete({ where: { id: stationId } });

  revalidatePath("/");
  revalidatePath(`/trip/${station.tripId}`);
  revalidatePath(`/admin/trips/${station.tripId}`);
}

export async function reorderStations(tripId: number, stationIds: number[]) {
  await requireAuth();

  await Promise.all(
    stationIds.map((id, index) =>
      prisma.station.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath("/");
  revalidatePath(`/trip/${tripId}`);
  revalidatePath(`/admin/trips/${tripId}`);
}
