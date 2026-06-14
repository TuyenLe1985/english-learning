/**
 * /grammar/[area]/[topic]/[lesson] — Grammar lesson detail page.
 *
 * GRAM-02 (explanation before exercises), GRAM-03 (5-type carousel),
 * GRAM-04 (session completion + mastery update), GRAM-06 (weak-review mode).
 *
 * Server Component: fetches GrammarLessonDetailDto from NestJS via fetchWithAuth
 * with forwarded JWE cookie against INTERNAL_API_URL. When searchParams.review
 * === "weak", also fetches the weak-questions set and passes it to
 * GrammarLessonPage, which will skip the explanation phase and run only those
 * questions (D-09).
 *
 * Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: max-w-2xl, lesson page with explanation → carousel → results sub-states
 * all managed by GrammarLessonPage client component.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { GrammarLessonPage } from "@/components/grammar/grammar-lesson-page";
import type { GrammarLessonDetailDto, GrammarQuestionDto } from "@repo/shared";

async function fetchLessonDetail(
  cookieHeader: string,
  lessonSlug: string,
): Promise<GrammarLessonDetailDto | null> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/grammar/lessons/${lessonSlug}`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<GrammarLessonDetailDto>;
  } catch {
    return null;
  }
}

async function fetchWeakQuestions(
  cookieHeader: string,
  topicSlug: string,
): Promise<GrammarQuestionDto[]> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/grammar/topics/${topicSlug}/weak-questions`,
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

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Fetch lesson detail with questions
  const lessonData = await fetchLessonDetail(cookieHeader, lessonSlug);

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
    weakQuestions = await fetchWeakQuestions(cookieHeader, topic);
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
