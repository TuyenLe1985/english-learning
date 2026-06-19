/**
 * /quiz — Quiz Center browse page.
 *
 * QUIZ-01: Displays 6 quiz type cards (Mixed Skill + 5 topics).
 * User selects a type and starts a quiz session.
 *
 * Server Component: auth-gated — redirects to /login if no session.
 * QuizTypeSelector is the Client Component handling the card grid + API call.
 *
 * UI-SPEC Screen 1: "Quiz Center" heading (20px semibold), subtitle at 14px muted,
 * centered max-w-3xl column.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuizTypeSelector } from "@/components/quiz/quiz-type-selector";
import type { CefrLevel } from "@/components/cefr-badge";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuizPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Extract CEFR level from session if available (populated by profile setup)
  const cefrLevel = (session.user as { cefrLevel?: string } | undefined)
    ?.cefrLevel as CefrLevel | undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-foreground">
          Quiz Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test your knowledge across all skills.
        </p>
      </div>

      {/* Quiz type card grid */}
      <QuizTypeSelector cefrLevel={cefrLevel ?? "B2"} />
    </div>
  );
}
