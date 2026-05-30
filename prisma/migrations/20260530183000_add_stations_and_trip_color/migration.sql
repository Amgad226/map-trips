-- CreateTable
CREATE TABLE "Station" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tripId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Station_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing trip coordinates into default stations
INSERT INTO "Station" ("name", "latitude", "longitude", "tripId", "order", "createdAt", "updatedAt")
SELECT "title", "latitude", "longitude", "id", 0, datetime('now'), datetime('now') FROM "Trip";

-- RedefineTables: Trip (add color, drop lat/lng)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "tripDate" DATETIME NOT NULL,
    "coverImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Trip" ("coverImage", "createdAt", "description", "id", "title", "tripDate", "updatedAt")
SELECT "coverImage", "createdAt", "description", "id", "title", "tripDate", "updatedAt" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE UNIQUE INDEX "Trip_title_key" ON "Trip"("title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineTables: Media (add stationId, assign default stations)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tripId" INTEGER NOT NULL,
    "stationId" INTEGER,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url360p" TEXT,
    "url720p" TEXT,
    "thumbnailUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileSizeBeforeCompress" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Media_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Media_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Media" ("createdAt", "fileSize", "fileSizeBeforeCompress", "id", "isFlagged", "mimeType", "order", "stationId", "thumbnailUrl", "tripId", "type", "updatedAt", "url", "url360p", "url720p")
SELECT m."createdAt", m."fileSize", m."fileSizeBeforeCompress", m."id", m."isFlagged", m."mimeType", m."order", s."id", m."thumbnailUrl", m."tripId", m."type", m."updatedAt", m."url", m."url360p", m."url720p"
FROM "Media" m
LEFT JOIN "Station" s ON s."tripId" = m."tripId";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE INDEX "Media_tripId_idx" ON "Media"("tripId");
CREATE INDEX "Media_stationId_idx" ON "Media"("stationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Station_tripId_idx" ON "Station"("tripId");
