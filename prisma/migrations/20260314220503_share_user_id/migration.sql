-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Share" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT,
    "userId" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Share" ("createdAt", "expiresAt", "id", "referenceId", "token", "type") SELECT "createdAt", "expiresAt", "id", "referenceId", "token", "type" FROM "Share";
DROP TABLE "Share";
ALTER TABLE "new_Share" RENAME TO "Share";
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
