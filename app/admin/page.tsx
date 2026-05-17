import { prisma } from "@/lib/db";
import Link from "next/link";
import TripCard from "@/components/admin/TripCard";

export default async function AdminPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { tripDate: "desc" },
    include: { media: true },
  });

  const totalTrips = trips.length;
  const totalMedia = trips.reduce((sum, t) => sum + t.media.length, 0);

  const totalImages = trips.reduce(
    (sum, t) => sum + t.media.filter((m) => m.type === "IMAGE").length,
    0
  );
  const totalVideos = trips.reduce(
    (sum, t) => sum + t.media.filter((m) => m.type === "VIDEO").length,
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalTrips}</p>
          <p className="text-xs text-gray-500 mt-1">Trips</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalMedia}</p>
          <p className="text-xs text-gray-500 mt-1">Total Media</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalImages}</p>
          <p className="text-xs text-gray-500 mt-1">Images</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalVideos}</p>
          <p className="text-xs text-gray-500 mt-1">Videos</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">All Trips</h2>
        <Link
          href="/admin/trips/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New Trip
        </Link>
      </div>

      {/* Trips grid */}
      {trips.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center text-gray-500 border border-gray-200">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
          <p className="text-sm">No trips yet. Create your first trip to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
