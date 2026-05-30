"use client";

import { Trip, Media, Keyword, Station, Participant, TripParticipant } from "@prisma/client";
import { useTranslation } from "react-i18next";
import TripForm from "./TripForm";
import DeleteTripButton from "./DeleteTripButton";
import MediaUploader from "./MediaUploader";
import MediaGallery from "./MediaGallery";
import KeywordTags from "@/components/trip/KeywordTags";
import StationManager from "./StationManager";
import TripParticipantsManager from "./TripParticipantsManager";

interface Props {
  trip: Trip & {
    media: Media[];
    keywords: Keyword[];
    stations: Station[];
    participants: (TripParticipant & { participant: Participant })[];
  };
  allParticipants: Participant[];
  handleUpdate: (formData: FormData) => Promise<void>;
  handleDeleteMedia: (mediaId: number) => Promise<void>;
  handleReorderMedia: (mediaIds: number[]) => Promise<void>;
  handleSetCover: (url: string | null) => Promise<void>;
  handleToggleFlag: (mediaId: number) => Promise<void>;
  handleDeleteTrip: (id: number) => Promise<void>;
  handleMoveMedia: (mediaId: number, stationId: number | null) => Promise<void>;
  handleSetStationCover: (mediaId: number, stationId: number | null) => Promise<void>;
  handleCreateStation: (formData: FormData) => Promise<void>;
  handleUpdateStation: (stationId: number, formData: FormData) => Promise<void>;
  handleDeleteStation: (stationId: number) => Promise<void>;
  handleReorderStations: (stationIds: number[]) => Promise<void>;
  handleAddParticipant: (participantId: number) => Promise<void>;
  handleRemoveParticipant: (participantId: number) => Promise<void>;
  handleSetBest: (participantId: number | null) => Promise<void>;
}

export default function EditTripView({
  trip,
  allParticipants,
  handleUpdate,
  handleDeleteMedia,
  handleReorderMedia,
  handleSetCover,
  handleToggleFlag,
  handleDeleteTrip,
  handleMoveMedia,
  handleSetStationCover,
  handleCreateStation,
  handleUpdateStation,
  handleDeleteStation,
  handleReorderStations,
  handleAddParticipant,
  handleRemoveParticipant,
  handleSetBest,
}: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("admin.editTrip")}</h1>
        <DeleteTripButton id={trip.id} action={handleDeleteTrip} />
      </div>

      <TripForm trip={trip} action={handleUpdate} />

      {/* Stations */}
      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.stations")}</h2>
        <StationManager
          stations={trip.stations}
          media={trip.media}
          onCreate={handleCreateStation}
          onUpdate={handleUpdateStation}
          onDelete={handleDeleteStation}
          onReorder={handleReorderStations}
        />
      </div>

      {/* Participants */}
      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.participants")}</h2>
        <TripParticipantsManager
          tripParticipants={trip.participants}
          allParticipants={allParticipants}
          onAdd={handleAddParticipant}
          onRemove={handleRemoveParticipant}
          onSetBest={handleSetBest}
        />
      </div>

      {/* Keywords */}
      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("tripDetail.keywords")}</h2>
        <KeywordTags tripId={trip.id} keywords={trip.keywords} />
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.uploadMedia")}</h2>
        <MediaUploader tripId={trip.id} stations={trip.stations} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.mediaGallery")}</h2>
        <MediaGallery
          media={trip.media}
          stations={trip.stations}
          coverImage={trip.coverImage}
          onDelete={handleDeleteMedia}
          onReorder={handleReorderMedia}
          onSetCover={handleSetCover}
          onToggleFlag={handleToggleFlag}
          onMoveMedia={handleMoveMedia}
          onSetStationCover={handleSetStationCover}
        />
      </div>
    </div>
  );
}
