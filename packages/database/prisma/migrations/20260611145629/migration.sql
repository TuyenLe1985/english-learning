-- AddForeignKey
ALTER TABLE "GrammarAttempt" ADD CONSTRAINT "GrammarAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
