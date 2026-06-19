/**
 * /quiz/[sessionId]/results — Quiz results page.
 *
 * QUIZ-03: Shows score card with accuracy, XP earned, per-skill breakdown.
 *
 * Server Component: auth-gated — redirects to /login if no session.
 * QuizResultsClient is the Client Component that reads results from sessionStorage
 * (stored by QuizSession on successful submit) and renders QuizScoreCard.
 *
 * XP toast and level-up modal mount point: QuizCompleteResponseDto is available
 * in sessionStorage — 07-06 adds the gamification overlays here.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuizResultsClient } from "@/components/quiz/quiz-results-client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ sessionId: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuizResultsPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { sessionId } = await params;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* QuizResultsClient reads sessionStorage[quiz-result-{sessionId}] on mount */}
      {/* TODO(07-06): XP toast + level-up modal will be mounted here using QuizCompleteResponseDto */}
      <QuizResultsClient sessionId={sessionId} />
    </div>
  );
}
