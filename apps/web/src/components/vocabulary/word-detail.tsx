/**
 * WordDetail — full word detail client component.
 *
 * VOCAB-02: Displays word, phonetic key, part-of-speech, CEFR badge,
 * tabbed content (Definition/Examples/Synonyms/Usage), and "Mark as learned" button.
 *
 * D-10: Pronunciation playback:
 *   - if audioStorageKey present: build URL from NEXT_PUBLIC_MINIO_PUBLIC_URL + '/' + key
 *     and call new Audio(url).play(); falls back to speechSynthesis on error
 *   - if no audioStorageKey: speechSynthesis directly (Web Speech API)
 *
 * D-11: "Mark as learned" POSTs to /api/vocabulary/enroll { wordId } — SRS entry point 2.
 *
 * Security (T-03-12): audioStorageKey is a public content key — not auth-sensitive.
 *   Never pass the raw key to new Audio(); always build the full MinIO/R2 URL.
 */

"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { CefrBadge, type CefrLevel } from "@/components/cefr-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { VocabularyWordDto } from "@repo/shared";

// MinIO/R2 public base URL — audioStorageKey is a KEY, not a full URL (D-10)
const MINIO_PUBLIC_URL =
  process.env["NEXT_PUBLIC_MINIO_PUBLIC_URL"] ?? "http://localhost:9000/english-learning";

interface WordDetailProps {
  word: VocabularyWordDto;
  /** True if this word is already enrolled in SRS */
  isEnrolled?: boolean;
}

export function WordDetail({ word, isEnrolled: initialEnrolled = false }: WordDetailProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [enrolling, setEnrolling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /**
   * D-10: Play pronunciation.
   * Builds full audio URL from storage key; falls back to speechSynthesis.
   * CRITICAL: audioStorageKey is a KEY not URL — never pass raw key to new Audio().
   */
  function playPronunciation() {
    if (isPlaying) return;
    setIsPlaying(true);

    if (word.audioStorageKey) {
      // Build the full audio URL — NEXT_PUBLIC_MINIO_PUBLIC_URL + '/' + key
      const audioUrl = `${MINIO_PUBLIC_URL}/${word.audioStorageKey}`;
      const audio = new Audio(audioUrl);
      audio
        .play()
        .catch(() => {
          // Fallback to browser TTS on any audio error
          window.speechSynthesis.speak(
            new SpeechSynthesisUtterance(word.word),
          );
        })
        .finally(() => setIsPlaying(false));
    } else {
      // No audio stored — use browser Web Speech API directly (zero cost)
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word.word));
      setIsPlaying(false);
    }
  }

  /**
   * D-11: Mark as learned — POSTs to /api/vocabulary/enroll { wordId }.
   * On success: show toast and switch button to enrolled/disabled state.
   */
  async function handleMarkAsLearned() {
    if (enrolled || enrolling) return;
    setEnrolling(true);
    try {
      const res = await fetch("/api/vocabulary/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: word.id }),
      });
      if (res.ok) {
        setEnrolled(true);
        showToast("Word added to review schedule");
      } else {
        showToast("Couldn't add to review schedule. Try again.");
      }
    } catch {
      showToast("Couldn't add to review schedule. Try again.");
    } finally {
      setEnrolling(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Word header — Display 28px/600 + phonetic + play button */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-foreground">{word.word}</h1>
          {/* Play pronunciation button — aria-label per UI-SPEC §Accessibility */}
          <button
            type="button"
            aria-label={`Play pronunciation of ${word.word}`}
            onClick={playPronunciation}
            disabled={isPlaying}
            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>

        {/* Phonetic key — Body 16px/400 muted — always shown (D-10) */}
        {word.pronunciationKey && (
          <p className="mt-1 text-base text-muted-foreground">
            {word.pronunciationKey}
          </p>
        )}

        {/* Badges row — part of speech + CEFR level */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {word.partOfSpeech && (
            <Badge variant="secondary" className="text-xs">
              {word.partOfSpeech}
            </Badge>
          )}
          <CefrBadge level={word.cefrLevel as CefrLevel} />
        </div>
      </div>

      {/* Tabbed content — Definition / Examples / Synonyms / Usage (UI-SPEC word detail) */}
      <Tabs defaultValue="definition" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="definition">Definition</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="synonyms">Synonyms</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        {/* Definition tab */}
        <TabsContent value="definition">
          <p className="text-base leading-relaxed text-foreground">
            {word.definition}
          </p>
        </TabsContent>

        {/* Examples tab — 2-3 example sentences, italicized */}
        <TabsContent value="examples">
          {word.examples.length > 0 ? (
            <ul className="space-y-3">
              {word.examples.map((example, i) => (
                <li
                  key={i}
                  className="text-base italic leading-relaxed text-foreground"
                >
                  &ldquo;{example}&rdquo;
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">No examples available.</p>
          )}
        </TabsContent>

        {/* Synonyms tab — badge chips */}
        <TabsContent value="synonyms">
          {word.synonyms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {word.synonyms.map((synonym) => (
                <Badge key={synonym} variant="outline">
                  {synonym}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-base text-muted-foreground">No synonyms available.</p>
          )}
        </TabsContent>

        {/* Usage tab — usage patterns */}
        <TabsContent value="usage">
          <div className="space-y-2">
            {word.partOfSpeech && (
              <p className="text-base leading-relaxed text-foreground">
                Used as a <span className="font-semibold">{word.partOfSpeech}</span>.
              </p>
            )}
            <p className="text-base leading-relaxed text-foreground">
              CEFR level: <span className="font-semibold">{word.cefrLevel}</span>
            </p>
            {word.frequency > 0 && (
              <p className="text-base leading-relaxed text-foreground">
                Frequency rank: <span className="font-semibold">#{word.frequency}</span>
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mark as learned — D-11 SRS entry point */}
      {enrolled ? (
        <button
          type="button"
          disabled
          className="w-full rounded-lg border border-border bg-muted px-6 py-3 text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed sm:w-auto"
        >
          In your review schedule
        </button>
      ) : (
        <button
          type="button"
          onClick={handleMarkAsLearned}
          disabled={enrolling}
          className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70 sm:w-auto"
        >
          {enrolling ? "Adding..." : "Mark as learned"}
        </button>
      )}

      {/* Practice this set — ghost link at bottom (UI-SPEC) */}
      {word.category && (
        <div className="mt-4">
          <a
            href={`/vocabulary/${word.category}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to {word.category} words
          </a>
        </div>
      )}

      {/* Toast notification (PATTERNS Toast Notification) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
