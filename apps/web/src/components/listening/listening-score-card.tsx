'use client';

/**
 * ListeningScoreCard — inline score card rendered after session submit (D-16).
 *
 * UI-SPEC: framer-motion entrance (opacity 0→1, scale 0.95→1, 0.3s easeOut),
 * score headline, accuracy/XP sub-line, 3-row exercise breakdown, transcript
 * reminder (when wordTimestamps available), action buttons.
 */

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListeningScoreCardProps {
  score: number;
  total: number;
  xpEarned: number;
  breakdown: {
    multipleChoice: [number, number]; // [correct, total]
    fillMissingWords: [number, number];
    dictation: [number, number];
  };
  hasWordTimestamps: boolean;
  onReset: () => void;
}

// ─── ListeningScoreCard ───────────────────────────────────────────────────────

export function ListeningScoreCard({
  score,
  total,
  xpEarned,
  breakdown,
  hasWordTimestamps,
}: ListeningScoreCardProps) {
  const router = useRouter();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const rows: Array<{ label: string; correct: number; rowTotal: number }> = [
    { label: 'Multiple Choice', correct: breakdown.multipleChoice[0], rowTotal: breakdown.multipleChoice[1] },
    { label: 'Fill in the Blank', correct: breakdown.fillMissingWords[0], rowTotal: breakdown.fillMissingWords[1] },
    { label: 'Dictation', correct: breakdown.dictation[0], rowTotal: breakdown.dictation[1] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-lg mx-auto mt-8"
      role="region"
      aria-label="Exercise results"
    >
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {/* Score headline */}
          <div className="text-center">
            <p className="text-[28px] font-semibold text-foreground text-center">
              {score}/{total} correct
            </p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {pct}% accuracy · {xpEarned} XP earned
            </p>
          </div>

          {/* Exercise breakdown */}
          <dl className="flex flex-col gap-2">
            {rows.map(({ label, correct, rowTotal }) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground font-medium">
                  {correct}/{rowTotal}
                </dd>
              </div>
            ))}
          </dl>

          {/* Transcript reminder (when word timestamps available) */}
          {hasWordTimestamps && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              The transcript is now unlocked. Tap any word to add it to your
              vocabulary.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-2">
            <Button
              variant="default"
              size="lg"
              className="min-h-[44px] w-full"
              onClick={() => router.push('/listening')}
            >
              Try another item
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] w-full"
              onClick={() => router.push('/listening')}
            >
              Browse all listening
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
