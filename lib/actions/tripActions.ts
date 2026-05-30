"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const tripSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  color: z.string().optional(),
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

  const createData = {
    ...parsed.data,
    color: parsed.data.color || "#3b82f6",
  };

  try {
    const trip = await prisma.trip.create({
      data: createData,
    });

    revalidatePath("/");
    redirect(`/admin/trips/${trip.id}`);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("A trip with this title already exists");
    }
    throw error;
  }
}

export async function updateTrip(id: number, formData: FormData) {
  await requireAuth();

  const data = Object.fromEntries(formData.entries());
  const parsed = tripSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(Object.values(errors).flat().join(", "));
  }

  const updateData = {
    ...parsed.data,
    color: parsed.data.color || "#3b82f6",
  };

  try {
    await prisma.trip.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath(`/trip/${id}`);
    revalidatePath(`/admin/trips/${id}`);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("A trip with this title already exists");
    }
    throw error;
  }
}

export async function deleteTrip(id: number) {
  await requireAuth();

  await prisma.trip.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}
