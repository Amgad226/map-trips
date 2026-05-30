-- CreateTable Participant
CREATE TABLE "Participant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable TripParticipant
CREATE TABLE "TripParticipant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tripId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripParticipant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TripParticipant_tripId_participantId_key" ON "TripParticipant"("tripId", "participantId");
CREATE INDEX "TripParticipant_tripId_idx" ON "TripParticipant"("tripId");
CREATE INDEX "TripParticipant_participantId_idx" ON "TripParticipant"("participantId");
