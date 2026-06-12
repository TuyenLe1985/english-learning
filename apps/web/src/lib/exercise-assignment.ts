/**
 * Exercise Type Assignment (D-05, VOCAB-03)
 *
 * Assigns one of 6 exercise types to each word in a practice session.
 * Rules:
 * - At most 2 matching exercises per session (matching covers 4 words each; D-08)
 * - Remaining words get random assignments from the other 5 types
 * - If fewer than 4 words available, skip matching entirely
 *
 * Pure function — deterministic under a seeded RNG (or Math.random in production).
 */

export type ExerciseType =
  | "flashcard"
  | "matching"
  | "cloze"
  | "context-selection"
  | "synonym"
  | "recall";

export type ExerciseAssignment =
  | { type: "flashcard" | "cloze" | "context-selection" | "synonym" | "recall"; wordIndex: number }
  | { type: "matching"; wordIndices: number[] };

/**
 * Assign exercise types to a list of words.
 *
 * @param wordCount - Total number of words in the session
 * @param rng - Optional random function (defaults to Math.random)
 * @returns Array of exercise assignments covering all words
 */
export function assignExerciseTypes(
  wordCount: number,
  rng: () => number = Math.random,
): ExerciseAssignment[] {
  const assignments: ExerciseAssignment[] = [];
  let assignedIndices = new Set<number>();

  // Up to 2 matching exercises (each covers 4 words)
  const maxMatching = Math.min(2, Math.floor(wordCount / 4));
  let matchingCount = 0;

  // Build pool of word indices
  const allIndices = Array.from({ length: wordCount }, (_, i) => i);
  const shuffled = shuffle(allIndices, rng);

  let cursor = 0;

  // Assign matching groups first (at most 2)
  while (matchingCount < maxMatching && cursor + 4 <= wordCount) {
    const matchIndices = shuffled.slice(cursor, cursor + 4);
    assignments.push({ type: "matching", wordIndices: matchIndices });
    matchIndices.forEach((i) => assignedIndices.add(i));
    cursor += 4;
    matchingCount++;
  }

  // Assign remaining words to the other 5 types
  const singleTypes: Array<"flashcard" | "cloze" | "context-selection" | "synonym" | "recall"> = [
    "flashcard",
    "cloze",
    "context-selection",
    "synonym",
    "recall",
  ];

  for (let i = cursor; i < wordCount; i++) {
    const wordIndex = shuffled[i]!;
    const type = singleTypes[Math.floor(rng() * singleTypes.length)]!;
    assignments.push({ type, wordIndex });
    assignedIndices.add(wordIndex);
  }

  return assignments;
}

/**
 * Fisher-Yates shuffle (pure, uses provided rng)
 */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
