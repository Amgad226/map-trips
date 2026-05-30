-- Add isStationCover to Media
ALTER TABLE "Media" ADD COLUMN "isStationCover" BOOLEAN NOT NULL DEFAULT false;

-- RedefineTables: Station (drop coverImage)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Station" (
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
INSERT INTO "new_Station" ("id", "name", "latitude", "longitude", "order", "tripId", "createdAt", "updatedAt")
SELECT "id", "name", "latitude", "longitude", "order", "tripId", "createdAt", "updatedAt" FROM "Station";
DROP TABLE "Station";
ALTER TABLE "new_Station" RENAME TO "Station";
CREATE INDEX "Station_tripId_idx" ON "Station"("tripId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
