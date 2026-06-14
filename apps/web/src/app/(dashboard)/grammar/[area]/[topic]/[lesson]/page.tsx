/**
 * /grammar/[area]/[topic]/[lesson] — Grammar lesson detail page.
 *
 * GRAM-02 (explanation before exercises), GRAM-03 (5-type carousel),
 * GRAM-04 (session completion + mastery update), GRAM-06 (weak-review mode).
 *
 * Server Component: fetches GrammarLessonDetailDto from NestJS using
 * getSessionToken(). When searchParams.review === "weak", also fetches
 * the weak-questions set and passes it to GrammarLessonPage, which will
 * skip the explanation phase and run only those questions (D-09).
 *
 * Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: max-w-2xl, lesson page with explanation → carousel → results sub-states
 * all managed by GrammarLessonPage client component.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { getSessionToken } from "@/lib/get-session-token";
import { GrammarLessonPage } from "@/components/grammar/grammar-lesson-page";
import type { GrammarLessonDetailDto, GrammarQuestionDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

async function fetchLessonDetail(
  lessonSlug: string,
): Promise<GrammarLessonDetailDto | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(
      `${API_URL}/api/grammar/lessons/${lessonSlug}`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<GrammarLessonDetailDto>;
  } catch {
    return null;
  }
}

async function fetchWeakQuestions(
  topicSlug: string,
): Promise<GrammarQuestionDto[]> {
  try {
    const token = getSessionToken();
    const res = await fetch(
      `${API_URL}/api/grammar/topics/${topicSlug}/weak-questions`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) return [];
    return res.json() as Promise<GrammarQuestionDto[]>;
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ area: string; topic: string; lesson: string }>;
  searchParams: Promise<{ review?: string }>;
}

export default async function GrammarLessonDetailPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { area, topic, lesson: lessonSlug } = await params;
  const { review } = await searchParams;

  // Fetch lesson detail with questions
  const lessonData = await fetchLessonDetail(lessonSlug);

  if (!lessonData) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/grammar/${area}/${topic}`}
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back
        </Link>
        <p
          role="status"
          className="py-16 text-center text-base text-muted-foreground"
        >
          Could not load this lesson. Try refreshing the page.
        </p>
      </div>
    );
  }

  // Weak-review mode (D-09): review=weak → fetch weak-questions + skip explanation
  let weakQuestions: GrammarQuestionDto[] | undefined;
  if (review === "weak") {
    weakQuestions = await fetchWeakQuestions(topic);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link to topic */}
      <Link
        href={`/grammar/${area}/${topic}`}
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Back to topic
      </Link>

      {/* Lesson orchestrator — explanation → exercises → results */}
      <GrammarLessonPage
        lesson={lessonData}
        areaSlug={area}
        topicSlug={topic}
        weakQuestions={weakQuestions}
      />
    </div>
  );
}
