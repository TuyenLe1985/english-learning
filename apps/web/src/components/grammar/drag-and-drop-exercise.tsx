"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GrammarQuestion {
  id: string;
  exerciseType: string;
  prompt: string;
  /** For multi-blank: answers joined with "|", e.g. "has written|has not submitted" */
  answer: string;
  distractors: string[];
  explanation?: string | null;
  difficulty: number;
  xpReward: number;
}

interface Props {
  question: GrammarQuestion;
  onCorrect: () => void;
  onIncorrect: () => void;
}

interface DraggableWordProps {
  id: string;
  word: string;
}

function DraggableWord({ id, word }: DraggableWordProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`word-chip-${id}`}
      className={cn(
        "inline-flex cursor-grab items-center rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 active:cursor-grabbing",
        isDragging && "opacity-80 ring-2 ring-primary",
      )}
    >
      {word}
    </span>
  );
}

interface DroppableBlankProps {
  id: string;
  filledWord?: string;
  isCorrect?: boolean;
  isWrong?: boolean;
  showFeedback?: boolean;
}

function DroppableBlank({ id, filledWord, isCorrect, isWrong, showFeedback }: DroppableBlankProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <span
      ref={setNodeRef}
      data-testid={`blank-slot-${id}`}
      className={cn(
        "mx-1 inline-flex h-8 min-w-[80px] items-center justify-center rounded border-2 border-dashed border-border bg-background text-sm",
        isOver && "border-primary bg-primary/5",
        filledWord && "border border-border bg-secondary font-medium",
        showFeedback && isCorrect && "border-green-500 bg-green-50 text-green-800",
        showFeedback && isWrong && "border-red-500 bg-red-50 text-red-800",
      )}
    >
      {filledWord ?? "..."}
    </span>
  );
}

/**
 * Parses the prompt for ___ markers and returns an array of segments.
 * Each segment is either a text string or a blank placeholder.
 */
function parsePrompt(prompt: string): Array<{ type: "text" | "blank"; value: string; index?: number }> {
  const parts = prompt.split("___");
  const segments: Array<{ type: "text" | "blank"; value: string; index?: number }> = [];
  let blankIndex = 0;
  parts.forEach((part, i) => {
    if (part) {
      segments.push({ type: "text", value: part });
    }
    if (i < parts.length - 1) {
      segments.push({ type: "blank", value: "", index: blankIndex++ });
    }
  });
  return segments;
}

export function DragAndDropExercise({ question, onCorrect, onIncorrect }: Props) {
  const { prompt, answer, distractors } = question;

  // Parse answer — multi-blank uses "|" separator
  const answerParts = answer.includes("|") ? answer.split("|") : [answer];
  const blankCount = (prompt.match(/___/g) ?? []).length;

  // Build initial word bank: all answer parts + distractors, each with unique id
  const [allWords] = useState<Array<{ id: string; word: string }>>(() => {
    const words = [...answerParts, ...distractors].map((word, i) => ({
      id: `word-${i}-${word}`,
      word,
    }));
    return words;
  });

  // Map: blank index → word id placed there
  const [blankFills, setBlankFills] = useState<Record<number, string>>({});
  // Active drag id
  const [activeId, setActiveId] = useState<string | null>(null);
  // Feedback state
  const [checked, setChecked] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState<Record<number, boolean>>({});

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Words still available in the bank (not placed in any blank)
  const placedWordIds = new Set(Object.values(blankFills));
  const bankWords = allWords.filter((w) => !placedWordIds.has(w.id));

  // Word id → word text lookup
  const wordById = Object.fromEntries(allWords.map((w) => [w.id, w.word]));

  const hasUnfilledBlanks = Object.keys(blankFills).length < blankCount;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeWordId = active.id as string;
    const overId = over.id as string;

    // over.id format: "blank-{index}"
    if (!overId.startsWith("blank-")) return;
    const blankIndex = parseInt(overId.replace("blank-", ""), 10);

    setBlankFills((prev) => {
      const next = { ...prev };
      // If the blank already has a word, return it to the bank (remove from fills)
      // The word will appear back in bankWords automatically since it won't be in placedWordIds
      // If the dragged word was already in another blank, remove it from there
      const prevBlankForWord = Object.entries(next).find(([, wId]) => wId === activeWordId);
      if (prevBlankForWord) {
        delete next[parseInt(prevBlankForWord[0], 10)];
      }
      next[blankIndex] = activeWordId;
      return next;
    });
  };

  const handleCheck = () => {
    const feedback: Record<number, boolean> = {};
    let allCorrect = true;
    for (let i = 0; i < blankCount; i++) {
      const placedWordId = blankFills[i];
      const placedWord = placedWordId ? wordById[placedWordId] : undefined;
      const expectedAnswer = answerParts[i];
      const correct =
        placedWord !== undefined &&
        expectedAnswer !== undefined &&
        placedWord.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
      feedback[i] = correct;
      if (!correct) allCorrect = false;
    }
    setFeedbackCorrect(feedback);
    setChecked(true);
    timerRef.current = setTimeout(() => {
      if (allCorrect) onCorrect(); else onIncorrect();
    }, 900);
  };

  const segments = parsePrompt(prompt);
  const activeWord = activeId ? allWords.find((w) => w.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-8">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Drag words to fill the blanks</p>
          <p className="text-base leading-relaxed text-foreground">
            {segments.map((seg, i) => {
              if (seg.type === "text") {
                return <span key={i}>{seg.value}</span>;
              }
              const blankIdx = seg.index ?? 0;
              const filledWordId = blankFills[blankIdx];
              const filledWord = filledWordId ? wordById[filledWordId] : undefined;
              return (
                <DroppableBlank
                  key={i}
                  id={`blank-${blankIdx}`}
                  filledWord={filledWord}
                  isCorrect={feedbackCorrect[blankIdx]}
                  isWrong={checked && !feedbackCorrect[blankIdx]}
                  showFeedback={checked}
                />
              );
            })}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Word Bank
          </p>
          <div className="flex flex-wrap gap-2">
            {bankWords.map((w) => (
              <DraggableWord key={w.id} id={w.id} word={w.word} />
            ))}
          </div>
        </div>

        {!checked && (
          <Button
            onClick={handleCheck}
            disabled={hasUnfilledBlanks}
            className="min-h-[44px]"
          >
            Check
          </Button>
        )}

        {checked && (
          <div className="flex flex-col gap-2">
            {Object.values(feedbackCorrect).every(Boolean) ? (
              <p className="text-sm font-medium text-green-700">Correct!</p>
            ) : (
              <p className="text-sm text-red-700">
                Some answers were incorrect. Review the highlighted blanks.
              </p>
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeWord && (
          <span className="inline-flex cursor-grabbing items-center rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground opacity-80 shadow-lg ring-2 ring-primary">
            {activeWord.word}
          </span>
        )}
      </DragOverlay>
    </DndContext>
  );
}
