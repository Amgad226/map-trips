import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TripForm from "@/components/admin/TripForm";
import DeleteTripButton from "@/components/admin/DeleteTripButton";
import MediaUploader from "@/components/admin/MediaUploader";
import MediaGallery from "@/components/admin/MediaGallery";
import {
  updateTrip,
  deleteTrip,
} from "@/lib/actions/tripActions";
import {
  uploadMedia,
  deleteMedia,
  reorderMedia,
  setCoverImage,
} from "@/lib/actions/mediaActions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTripPage({ params }: Props) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { media: { orderBy: { order: "asc" } } },
  });

  if (!trip) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateTrip(id, formData);
  }

  async function handleUpload(formData: FormData) {
    "use server";
    return uploadMedia(id, formData);
  }

  async function handleDeleteMedia(mediaId: string) {
    "use server";
    await deleteMedia(mediaId);
  }

  async function handleReorderMedia(mediaIds: string[]) {
    "use server";
    await reorderMedia(id, mediaIds);
  }

  async function handleSetCover(url: string | null) {
    "use server";
    await setCoverImage(id, url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Trip</h1>
        <DeleteTripButton id={id} action={deleteTrip} />
      </div>

      <TripForm trip={trip} action={handleUpdate} />

      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Media</h2>
        <MediaUploader tripId={id} action={handleUpload} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Gallery</h2>
        <MediaGallery
          tripId={id}
          media={trip.media}
          coverImage={trip.coverImage}
          onDelete={handleDeleteMedia}
          onReorder={handleReorderMedia}
          onSetCover={handleSetCover}
        />
      </div>
    </div>
  );
}
