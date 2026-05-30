import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import MapWrapper from "@/components/map/MapWrapper";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stations = await prisma.station.findMany({
    orderBy: { order: "asc" },
    include: {
      trip: true,
      _count: { select: { media: true } },
    },
  });

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1 relative">
        <MapWrapper stations={stations} />
      </main>
    </div>
  );
}
