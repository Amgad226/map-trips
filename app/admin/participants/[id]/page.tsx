import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateParticipant } from "@/lib/actions/participantActions";
import EditParticipantView from "@/components/admin/EditParticipantView";

interface Props {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error("Invalid participant ID");
  return n;
}

export default async function EditParticipantPage({ params }: Props) {
  const { id } = await params;
  const participantId = parseId(id);
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });

  if (!participant) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateParticipant(participantId, formData);
  }

  return <EditParticipantView participant={participant} handleUpdate={handleUpdate} />;
}
