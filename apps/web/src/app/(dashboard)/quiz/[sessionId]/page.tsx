/**
 * /quiz/[sessionId] — Quiz session page.
 *
 * QUIZ-02: Renders the quiz session one question at a time with progress bar.
 *
 * Server Component: auth-gated — redirects to /login if no session.
 * QuizSession is the Client Component that handles the session state machine.
 *
 * Questions are read from sessionStorage (populated by QuizTypeSelector at
 * start time) — no additional NestJS fetch needed here.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { CefrLevel } from "@/components/cefr-badge";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ sessionId: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuizSessionPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { sessionId } = await params;

  // Extract CEFR level from session if available
  const cefrLevel = (session.user as { cefrLevel?: string } | undefined)
    ?.cefrLevel as CefrLevel | undefined;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <QuizSession sessionId={sessionId} cefrLevel={cefrLevel ?? "B2"} />
    </div>
  );
}
