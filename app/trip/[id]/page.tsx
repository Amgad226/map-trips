import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getProxyUrl } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";
import GalleryGrid from "@/components/trip/GalleryGrid";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { media: { orderBy: { order: "asc" } } },
  });

  if (!trip) notFound();

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to map
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {trip.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>
              {new Date(trip.tripDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              {trip.latitude.toFixed(4)}, {trip.longitude.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Cover image */}
        {trip.coverImage && (
          <div className="mb-8">
            <img
              src={getProxyUrl(trip.coverImage)}
              alt={trip.title}
              className="w-full max-h-[500px] object-cover rounded-2xl shadow-lg"
            />
          </div>
        )}

        {/* Description */}
        {trip.description && (
          <div className="mb-10">
            <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
              {trip.description}
            </p>
          </div>
        )}

        {/* Media gallery */}
        {trip.media.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Gallery</h2>
            <GalleryGrid media={trip.media} />
          </div>
        )}

        {/* No media */}
        {trip.media.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p>No photos or videos yet.</p>
          </div>
        )}
      </main>
    </>
  );
}
