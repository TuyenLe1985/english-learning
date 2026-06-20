-- Phase 8: CefrHistory model + GIN full-text indexes
-- CefrHistory: time-series CEFR level tracking for ANLT-01 progression chart
-- GIN indexes: unblock SRCH-02 full-text search across 4 content tables

-- CreateTable
CREATE TABLE "CefrHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CefrHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CefrHistory_userId_recordedAt_idx" ON "CefrHistory"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "CefrHistory" ADD CONSTRAINT "CefrHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DO NOT REMOVE: manually added GIN indexes for FTS — Prisma does not generate these.
CREATE INDEX IF NOT EXISTS "VocabularyWord_fts_idx"
  ON "VocabularyWord" USING GIN (to_tsvector('english', word || ' ' || definition));

CREATE INDEX IF NOT EXISTS "GrammarLesson_fts_idx"
  ON "GrammarLesson" USING GIN (to_tsvector('english', title || ' ' || explanation));

CREATE INDEX IF NOT EXISTS "ReadingPassage_fts_idx"
  ON "ReadingPassage" USING GIN (to_tsvector('english', title || ' ' || content));

CREATE INDEX IF NOT EXISTS "ListeningContent_fts_idx"
  ON "ListeningContent" USING GIN (to_tsvector('english', title || ' ' || "transcriptText"));
