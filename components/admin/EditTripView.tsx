"use client";

import { Trip, Media, Keyword } from "@prisma/client";
import { useTranslation } from "react-i18next";
import TripForm from "./TripForm";
import DeleteTripButton from "./DeleteTripButton";
import MediaUploader from "./MediaUploader";
import MediaGallery from "./MediaGallery";
import KeywordTags from "@/components/trip/KeywordTags";

interface Props {
  trip: Trip & { media: Media[]; keywords: Keyword[] };
  handleUpdate: (formData: FormData) => Promise<void>;
  handleDeleteMedia: (mediaId: number) => Promise<void>;
  handleReorderMedia: (mediaIds: number[]) => Promise<void>;
  handleSetCover: (url: string | null) => Promise<void>;
  handleToggleFlag: (mediaId: number) => Promise<void>;
  handleDeleteTrip: (id: number) => Promise<void>;
}

export default function EditTripView({
  trip,
  handleUpdate,
  handleDeleteMedia,
  handleReorderMedia,
  handleSetCover,
  handleToggleFlag,
  handleDeleteTrip,
}: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("admin.editTrip")}</h1>
        <DeleteTripButton id={trip.id} action={handleDeleteTrip} />
      </div>

      <TripForm trip={trip} action={handleUpdate} />

      {/* Keywords */}
      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("tripDetail.keywords")}</h2>
        <KeywordTags tripId={trip.id} keywords={trip.keywords} />
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.uploadMedia")}</h2>
        <MediaUploader tripId={trip.id} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.mediaGallery")}</h2>
        <MediaGallery
          media={trip.media}
          coverImage={trip.coverImage}
          onDelete={handleDeleteMedia}
          onReorder={handleReorderMedia}
          onSetCover={handleSetCover}
          onToggleFlag={handleToggleFlag}
        />
      </div>
    </div>
  );
}
