/**
 * DragAndDropExercise — unit tests (Vitest + Testing Library)
 *
 * RED scaffold — DragAndDropExercise component does not exist yet.
 * Import will fail until Plan 04-03 implements the component.
 *
 * Asserts:
 * 1. Blank slots render — count matches number of ___ markers in prompt
 * 2. Word bank chips render — shows answer + distractors (all words)
 * 3. Each blank slot is identifiable (role="button" or data-testid)
 * 4. Word bank count equals answer parts + distractors length
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DragAndDropExercise } from "../drag-and-drop-exercise";

// Mock @dnd-kit to avoid pointer/sensor requirements in jsdom
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
  }),
}));

describe("DragAndDropExercise", () => {
  const singleBlankQuestion = {
    question: {
      id: "q-dnd-1",
      exerciseType: "DRAG_AND_DROP" as const,
      prompt: "She ___ the report but ___ it yet.",
      answer: "has written|has not submitted",
      distractors: ["wrote", "did not send", "is writing", "have finished"],
      explanation: "Two blanks: 'has written' and 'has not submitted'.",
      difficulty: 2,
      xpReward: 15,
    },
    onCorrect: vi.fn(),
    onIncorrect: vi.fn(),
  };

  const singleWordQuestion = {
    question: {
      id: "q-dnd-2",
      exerciseType: "DRAG_AND_DROP" as const,
      prompt: "Plants need ___ to survive.",
      answer: "water",
      distractors: ["fire", "sand", "glass"],
      explanation: "Plants need water.",
      difficulty: 1,
      xpReward: 10,
    },
    onCorrect: vi.fn(),
    onIncorrect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders blank slots matching the number of ___ markers (single blank)", () => {
    render(<DragAndDropExercise {...singleWordQuestion} />);
    const blanks = screen.getAllByTestId(/blank-slot/);
    // "Plants need ___ to survive." has 1 blank
    expect(blanks).toHaveLength(1);
  });

  it("renders blank slots matching the number of ___ markers (two blanks)", () => {
    render(<DragAndDropExercise {...singleBlankQuestion} />);
    const blanks = screen.getAllByTestId(/blank-slot/);
    // Prompt has 2 ___ markers
    expect(blanks).toHaveLength(2);
  });

  it("renders word bank chips for all answer parts + distractors", () => {
    render(<DragAndDropExercise {...singleWordQuestion} />);
    // word bank = 1 answer + 3 distractors = 4
    const chips = screen.getAllByTestId(/word-chip/);
    expect(chips).toHaveLength(4);
  });

  it("word bank shows the correct answer as a chip", () => {
    render(<DragAndDropExercise {...singleWordQuestion} />);
    expect(screen.getByText("water")).toBeInTheDocument();
  });

  it("word bank shows all distractor chips", () => {
    render(<DragAndDropExercise {...singleWordQuestion} />);
    expect(screen.getByText("fire")).toBeInTheDocument();
    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("glass")).toBeInTheDocument();
  });

  it("renders the prompt text with blanks visible", () => {
    render(<DragAndDropExercise {...singleWordQuestion} />);
    // Prompt text (excluding the blank) should appear
    expect(screen.getByText(/Plants need/)).toBeInTheDocument();
  });
});
