/**
 * /review — SRS Review Queue page (Client Component, React Query)
 *
 * UI-SPEC /review layout:
 *   - Page heading "Review" (Display 28px/600) + due count subtitle
 *   - Queue progress bar "n of m reviewed"
 *   - Centered ReviewCard (max-w 480px) — shows word initially
 *   - "Show answer" reveals definition; then RatingButtons appear
 *   - On rating: POST /api/srs/review + invalidate ["srs-queue"] + advance to next card
 *   - Empty state "All caught up!" with "Browse Vocabulary" link
 *   - Loading skeleton; error state with retry button
 *
 * VOCAB-06: Due cards in a dedicated queue; A/H/G/E ratings reschedule via FSRS.
 * D-01: Due cards from DB query WHERE due <= NOW()
 * D-04: Max 20 cards per session
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { ReviewCard } from "@/components/srs/review-card";
import { RatingButtons } from "@/components/srs/rating-buttons";
import { Progress } from "@/components/ui/progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Rating = "Again" | "Hard" | "Good" | "Easy";

interface SrsCardWithWord {
  id: string;
  wordId: string;
  word: {
    word: string;
    definition: string;
    examples: string[];
  };
  due: string;
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // srs-queue: staleTime 0 — always fresh (D-01)
  const {
    data: queue,
    isLoading,
    isError,
    refetch,
  } = useQuery<SrsCardWithWord[]>({
    queryKey: ["srs-queue"],
    queryFn: () => fetch("/api/srs/queue").then((r) => r.json()),
    staleTime: 0,
    gcTime: 60_000, // 1 minute
  });

  const reviewMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: Rating }) =>
      fetch("/api/srs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, rating }),
      }).then((r) => r.json()),
    onSuccess: () => {
      // Invalidate queue — removes rated card from the list
      queryClient.invalidateQueries({ queryKey: ["srs-queue"] });
      setReviewedCount((prev) => prev + 1);
      setIsFlipped(false); // reset flip for next card
    },
    onError: () => {
      // Card stays current — no data loss. User can retry by clicking the rating again.
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="mb-6 h-3 w-full rounded-full" />
        <div className="mx-auto max-w-[480px]">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !queue) {
    return (
      <div className="mx-auto max-w-screen-xl">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-foreground font-medium">
            Couldn&apos;t load your review queue
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const totalInSession = reviewedCount + queue.length;
  const progressValue =
    totalInSession > 0 ? (reviewedCount / totalInSession) * 100 : 0;

  // Empty state — all caught up
  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-screen-xl">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Review</h1>
        <div
          role="status"
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <p className="text-2xl font-semibold text-foreground">
            All caught up!
          </p>
          <p className="text-base text-muted-foreground text-center max-w-xs">
            No cards are due right now. Come back later to keep your streak
            going.
          </p>
          <Link href="/vocabulary" className={buttonVariants({ variant: "outline" })}>
            Browse Vocabulary
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = queue[0]!;
  const firstExample = currentCard.word.examples?.[0];

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Review</h1>
        <span className="text-sm text-muted-foreground">
          {queue.length} card{queue.length !== 1 ? "s" : ""} due
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>
            {reviewedCount} of {totalInSession} reviewed
          </span>
        </div>
        <Progress
          value={progressValue}
          aria-label="Session progress"
          className="h-2"
        />
      </div>

      {/* Review card */}
      <div data-testid="srs-queue" className="flex flex-col items-center gap-6">
        <ReviewCard
          word={currentCard.word.word}
          definition={currentCard.word.definition}
          example={firstExample}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(true)}
        />

        {/* Rating buttons appear after reveal */}
        {isFlipped && (
          <div className="w-full max-w-[480px]">
            <RatingButtons
              onRate={(rating) =>
                reviewMutation.mutate({ cardId: currentCard.id, rating })
              }
              disabled={reviewMutation.isPending}
            />
            {reviewMutation.isError && (
              <p
                role="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                Couldn&apos;t save your rating — tap the rating again to retry.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
