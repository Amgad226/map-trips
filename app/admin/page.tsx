import { prisma } from "@/lib/db";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { tripDate: "desc" },
    include: { media: true },
  });

  return <AdminDashboard trips={trips} />;
}
