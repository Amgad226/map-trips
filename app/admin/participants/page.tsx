import { prisma } from "@/lib/db";
import { deleteParticipant } from "@/lib/actions/participantActions";
import ParticipantsView from "@/components/admin/ParticipantsView";

export default async function ParticipantsPage() {
  const participants = await prisma.participant.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <ParticipantsView participants={participants} onDelete={deleteParticipant} />;
}
