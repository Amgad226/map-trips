import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import Navbar from "@/components/layout/Navbar";
import TripDetailView from "@/components/trip/TripDetailView";

interface Props {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error("Invalid trip ID");
  return n;
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const tripId = parseId(id);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      media: { orderBy: { order: "asc" } },
      keywords: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trip) notFound();

  const user = await getCurrentUser();

  return (
    <>
      <Navbar />
      <TripDetailView trip={trip} isAdmin={!!user} />
    </>
  );
}
