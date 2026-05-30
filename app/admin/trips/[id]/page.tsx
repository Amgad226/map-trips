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
  moveMediaToStation,
  setStationCover,
} from "@/lib/actions/mediaActions";
import {
  createStation,
  updateStation,
  deleteStation,
  reorderStations,
} from "@/lib/actions/stationActions";
import {
  addParticipantToTrip,
  removeParticipantFromTrip,
  setBestParticipant,
} from "@/lib/actions/tripParticipantActions";
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
    include: {
      stations: { orderBy: { order: "asc" } },
      media: { orderBy: { order: "asc" } },
      keywords: true,
      participants: {
        include: { participant: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!trip) notFound();

  const allParticipants = await prisma.participant.findMany({
    orderBy: { name: "asc" },
  });

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

  async function handleMoveMedia(mediaId: number, stationId: number | null) {
    "use server";
    await moveMediaToStation(mediaId, stationId);
  }

  async function handleSetStationCover(mediaId: number, stationId: number | null) {
    "use server";
    await setStationCover(mediaId, stationId);
  }

  async function handleCreateStation(formData: FormData) {
    "use server";
    await createStation(tripId, formData);
  }

  async function handleUpdateStation(stationId: number, formData: FormData) {
    "use server";
    await updateStation(stationId, formData);
  }

  async function handleDeleteStation(stationId: number) {
    "use server";
    await deleteStation(stationId);
  }

  async function handleReorderStations(stationIds: number[]) {
    "use server";
    await reorderStations(tripId, stationIds);
  }

  async function handleAddParticipant(participantId: number) {
    "use server";
    await addParticipantToTrip(tripId, participantId);
  }

  async function handleRemoveParticipant(participantId: number) {
    "use server";
    await removeParticipantFromTrip(tripId, participantId);
  }

  async function handleSetBest(participantId: number | null) {
    "use server";
    await setBestParticipant(tripId, participantId);
  }

  return (
    <EditTripView
      trip={trip}
      allParticipants={allParticipants}
      handleUpdate={handleUpdate}
      handleDeleteMedia={handleDeleteMedia}
      handleReorderMedia={handleReorderMedia}
      handleSetCover={handleSetCover}
      handleToggleFlag={handleToggleFlag}
      handleDeleteTrip={deleteTrip}
      handleMoveMedia={handleMoveMedia}
      handleSetStationCover={handleSetStationCover}
      handleCreateStation={handleCreateStation}
      handleUpdateStation={handleUpdateStation}
      handleDeleteStation={handleDeleteStation}
      handleReorderStations={handleReorderStations}
      handleAddParticipant={handleAddParticipant}
      handleRemoveParticipant={handleRemoveParticipant}
      handleSetBest={handleSetBest}
    />
  );
}
