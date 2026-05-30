"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Trip, Media, Keyword, Station, Participant, TripParticipant } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";
import TripGallery from "./TripGallery";
import KeywordTags from "./KeywordTags";
import MediaModal from "./MediaModal";

interface Props {
  trip: Trip & {
    stations: (Station & { media: Media[] })[];
    media: Media[];
    keywords: Keyword[];
    participants: (TripParticipant & { participant: Participant })[];
  };
  isAdmin?: boolean;
}

export default function TripDetailView({ trip, isAdmin }: Props) {
  const { t } = useTranslation();
  const [modalMedia, setModalMedia] = useState<Media[] | null>(null);
  const [modalIndex, setModalIndex] = useState<number>(0);

  const openStationMedia = useCallback((stationMedia: Media[], index: number) => {
    setModalMedia(stationMedia);
    setModalIndex(index);
  }, []);

  const closeModal = useCallback(() => {
    setModalMedia(null);
  }, []);

  const handlePrev = useCallback(() => {
    if (!modalMedia) return;
    setModalIndex((prev) => (prev > 0 ? prev - 1 : modalMedia.length - 1));
  }, [modalMedia]);

  const handleNext = useCallback(() => {
    if (!modalMedia) return;
    setModalIndex((prev) => (prev < modalMedia.length - 1 ? prev + 1 : 0));
  }, [modalMedia]);

  const selectedMedia = modalMedia?.[modalIndex] ?? null;
  const bestParticipant = trip.participants.find((tp) => tp.isBest);

  function getStationCover(station: Station & { media: Media[] }): Media | undefined {
    return station.media.find((m) => m.isStationCover);
  }

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("tripDetail.backToMap")}
          </Link>

          {isAdmin && (
            <Link
              href={`/admin/trips/${trip.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/15"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t("actions.edit")}
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-3 tracking-tight">
            {trip.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(trip.tripDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: trip.color }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {trip.stations.length} {trip.stations.length === 1 ? t("tripDetail.station") : t("tripDetail.stations")}
            </span>
          </div>
        </div>

        {/* Cover image */}
        {trip.coverImage && (
          <div className="mb-10">
            <img
              src={getProxyUrl(trip.coverImage)}
              alt={trip.title}
              className="w-full max-h-[500px] object-cover rounded-3xl shadow-2xl shadow-foreground/5"
            />
          </div>
        )}

        {/* Keywords */}
        {trip.keywords.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t("tripDetail.keywords")}
            </h2>
            <KeywordTags keywords={trip.keywords} />
          </div>
        )}

        {/* Description */}
        {trip.description && (
          <div className="mb-12">
            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {trip.description}
            </p>
          </div>
        )}

        {/* Participants */}
        {trip.participants.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t("tripDetail.participants")}</h2>
            <div className="flex flex-wrap gap-4">
              {trip.participants.map((tp) => {
                const isBest = tp.isBest;
                return (
                  <div key={tp.participantId} className="relative flex flex-col items-center gap-2">
                    {/* Crown for best */}
                    {isBest && (
                      <div className="absolute -top-3 z-10">
                        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg border-2 border-background">
                          <svg className="w-5 h-5 text-amber-900" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div
                      className={`w-20 h-20 rounded-2xl overflow-hidden bg-muted border-2 ${
                        isBest ? "border-amber-400 ring-2 ring-amber-400/20" : "border-border"
                      }`}
                    >
                      {tp.participant.image ? (
                        <img
                          src={getProxyUrl(tp.participant.image)}
                          alt={tp.participant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-border">
                          <svg className="w-8 h-8 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground text-center max-w-[80px] truncate">
                      {tp.participant.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stations */}
        {trip.stations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t("tripDetail.stations")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trip.stations.map((station) => {
                const coverMedia = getStationCover(station);
                return (
                  <div
                    key={station.id}
                    id={`station-${station.id}`}
                    className="rounded-2xl border border-border bg-card overflow-hidden"
                  >
                    {/* Station cover image */}
                    {coverMedia && (
                      <div className="relative h-40 w-full">
                        <img
                          src={getProxyUrl(coverMedia.thumbnailUrl || coverMedia.url)}
                          alt={station.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="font-semibold text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{station.name}</h3>
                          <p className="text-xs text-white/70">
                            {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      {!coverMedia && (
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-foreground">{station.name}</h3>
                          <span className="text-xs text-muted-foreground">
                            {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {station.media.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {station.media.slice(0, 6).map((m, idx) => (
                            <div
                              key={m.id}
                              className="aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer group relative"
                              onClick={() => openStationMedia(station.media, idx)}
                            >
                              <img
                                src={getProxyUrl(m.thumbnailUrl || m.url)}
                                alt=""
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                              />
                              {m.type === "VIDEO" && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("tripDetail.noStationMedia")}</p>
                      )}
                      {station.media.length > 6 && (
                        <button
                          onClick={() => openStationMedia(station.media, 0)}
                          className="text-xs text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
                        >
                          +{station.media.length - 6} {t("tripDetail.moreItems")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media gallery */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">{t("tripDetail.gallery")}</h2>
          <TripGallery media={trip.media} />
        </div>
      </main>

      {/* Media Modal for station media */}
      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          onClose={closeModal}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}
