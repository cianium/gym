CREATE TYPE "TrainingRole" AS ENUM ('ADMIN','ATHLETE');
CREATE TYPE "TrainingStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
CREATE TABLE "TrainingAccount" (
 "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "phone" TEXT UNIQUE,
 "passwordHash" TEXT NOT NULL, "role" "TrainingRole" NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
 "mustChangePassword" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "TrainingSession" (
 "tokenHash" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL REFERENCES "TrainingAccount"("id") ON DELETE CASCADE,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TrainingSession_accountId_idx" ON "TrainingSession"("accountId");
CREATE INDEX "TrainingSession_expiresAt_idx" ON "TrainingSession"("expiresAt");
CREATE TABLE "TrainingLoginBucket" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "TrainingLoginBucket_expiresAt_idx" ON "TrainingLoginBucket"("expiresAt");
CREATE TABLE "TrainingAssignment" (
 "id" TEXT PRIMARY KEY, "athleteId" TEXT NOT NULL REFERENCES "TrainingAccount"("id") ON DELETE RESTRICT,
 "coachId" TEXT NOT NULL REFERENCES "TrainingAccount"("id") ON DELETE RESTRICT,
 "title" TEXT NOT NULL, "description" TEXT, "sessions" JSONB NOT NULL, "startsOn" DATE, "endsOn" DATE,
 "status" "TrainingStatus" NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CHECK ("endsOn" IS NULL OR "startsOn" IS NULL OR "endsOn">="startsOn")
);
CREATE INDEX "TrainingAssignment_athleteId_status_idx" ON "TrainingAssignment"("athleteId","status");
CREATE TABLE "TrainingEntry" (
 "id" TEXT PRIMARY KEY, "assignmentId" TEXT NOT NULL REFERENCES "TrainingAssignment"("id") ON DELETE RESTRICT,
 "athleteId" TEXT NOT NULL REFERENCES "TrainingAccount"("id") ON DELETE RESTRICT,
 "performedOn" DATE NOT NULL, "sessionDay" TEXT NOT NULL, "effort" INTEGER CHECK ("effort" BETWEEN 1 AND 10),
 "notes" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE ("assignmentId","athleteId","performedOn","sessionDay")
);
CREATE INDEX "TrainingEntry_athleteId_performedOn_idx" ON "TrainingEntry"("athleteId","performedOn");
