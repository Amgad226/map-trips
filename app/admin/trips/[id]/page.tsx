import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  updateTrip,
  deleteTrip,
} from "@/lib/actions/tripActions";
import {
  deleteMedia,
  reorderMedia,
  setCoverImage,
  toggleMediaFlag,
} from "@/lib/actions/mediaActions";
import EditTripView from "@/components/admin/EditTripView";

interface Props {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error("Invalid trip ID");
  return n;
}

export default async function EditTripPage({ params }: Props) {
  const { id } = await params;
  const tripId = parseId(id);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { media: { orderBy: { order: "asc" } }, keywords: true },
  });

  if (!trip) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateTrip(tripId, formData);
  }

  async function handleDeleteMedia(mediaId: number) {
    "use server";
    await deleteMedia(mediaId);
  }

  async function handleReorderMedia(mediaIds: number[]) {
    "use server";
    await reorderMedia(tripId, mediaIds);
  }

  async function handleSetCover(url: string | null) {
    "use server";
    await setCoverImage(tripId, url);
  }

  async function handleToggleFlag(mediaId: number) {
    "use server";
    await toggleMediaFlag(mediaId);
  }

  return (
    <EditTripView
      trip={trip}
      handleUpdate={handleUpdate}
      handleDeleteMedia={handleDeleteMedia}
      handleReorderMedia={handleReorderMedia}
      handleSetCover={handleSetCover}
      handleToggleFlag={handleToggleFlag}
      handleDeleteTrip={deleteTrip}
    />
  );
}
