"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const tripSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  tripDate: z.coerce.date(),
  coverImage: z.string().optional(),
});

export async function createTrip(formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = tripSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  const trip = await prisma.trip.create({
    data: parsed.data,
  });

  revalidatePath("/");
  redirect(`/admin/trips/${trip.id}`);
}

export async function updateTrip(id: string, formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = tripSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  await prisma.trip.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/");
  revalidatePath(`/trip/${id}`);
  revalidatePath(`/admin/trips/${id}`);
}

export async function deleteTrip(id: string) {
  await requireAuth();

  await prisma.trip.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}
