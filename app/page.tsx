import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import Map from "@/components/map/Map";
import MapClient from "@/components/map/MapClient";

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { tripDate: "desc" },
  });

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1 relative">
        <Map trips={trips} />
      </main>
    </div>
  );
}
