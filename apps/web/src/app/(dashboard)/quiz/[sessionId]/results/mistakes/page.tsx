/**
 * /quiz/[sessionId]/results/mistakes — Mistake review page (Screen 4, UI-SPEC).
 *
 * QUIZ-04: Displays all incorrect answers with full question re-render,
 * correct answer highlighted, and explanation shown below.
 *
 * Server Component: auth-gated.
 * MistakeReviewClient is the Client Component that reads results from sessionStorage
 * (stored by QuizSession on submit) and renders MistakeReview.
 * If sessionStorage is empty (refresh), falls back to GET /api/quiz/sessions/[sessionId]/mistakes.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MistakeReviewClient } from "@/components/quiz/mistake-review-client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ sessionId: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MistakesPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { sessionId } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <a
          href={`/quiz/${sessionId}/results`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Results
        </a>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Review Mistakes
      </h1>
      <MistakeReviewClient sessionId={sessionId} />
    </div>
  );
}
