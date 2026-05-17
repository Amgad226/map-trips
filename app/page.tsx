import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import MapWrapper from "@/components/map/MapWrapper";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { tripDate: "desc" },
  });

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1 relative">
        <MapWrapper trips={trips} />
      </main>
    </div>
  );
}
