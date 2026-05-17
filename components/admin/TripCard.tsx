"use client";

import Link from "next/link";
import { Trip, Media } from "@prisma/client";
import { getProxyUrl } from "@/lib/utils";

interface TripCardProps {
  trip: Trip & { media?: Media[] };
}

export default function TripCard({ trip }: TripCardProps) {
  const imageCount = trip.media?.filter((m) => m.type === "IMAGE").length || 0;
  const videoCount = trip.media?.filter((m) => m.type === "VIDEO").length || 0;

  return (
    <div className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover image or placeholder */}
      <div className="relative aspect-[16/10] bg-gray-100">
        {trip.coverImage ? (
          <img
            src={getProxyUrl(trip.coverImage)}
            alt={trip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          {imageCount > 0 && (
            <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {imageCount}
            </span>
          )}
          {videoCount > 0 && (
            <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {videoCount}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 truncate">{trip.title}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {new Date(trip.tripDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          <span className="mx-1">·</span>
          {trip.latitude.toFixed(4)}, {trip.longitude.toFixed(4)}
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/trips/${trip.id}`}
            className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 text-center hover:bg-blue-100 transition-colors"
          >
            Edit
          </Link>
          <Link
            href={`/trip/${trip.id}`}
            target="_blank"
            className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 text-center hover:bg-gray-200 transition-colors"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
