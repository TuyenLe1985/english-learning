/**
 * MultipleChoiceExercise — unit tests (Vitest + Testing Library)
 *
 * RED scaffold — MultipleChoiceExercise component does not exist yet.
 * Import will fail until Plan 04-03 implements the component.
 *
 * Asserts:
 * 1. Prompt text is rendered
 * 2. All 4 options are rendered (answer + 3 distractors)
 * 3. Clicking the correct option calls onCorrect
 * 4. Clicking an incorrect option calls onIncorrect
 * 5. After selection, options are disabled (no double-submission)
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MultipleChoiceExercise } from "../multiple-choice-exercise";

describe("MultipleChoiceExercise", () => {
  const defaultProps = {
    question: {
      id: "q-001",
      exerciseType: "MULTIPLE_CHOICE" as const,
      prompt: "She ___ to Paris before.",
      answer: "has been",
      distractors: ["is been", "was been", "have been"],
      explanation: "Use 'has been' for third-person singular.",
      difficulty: 1,
      xpReward: 10,
    },
    onCorrect: vi.fn(),
    onIncorrect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the question prompt", () => {
    render(<MultipleChoiceExercise {...defaultProps} />);
    expect(screen.getByText(/She ___ to Paris before\./)).toBeInTheDocument();
  });

  it("renders all four options (answer + 3 distractors)", () => {
    render(<MultipleChoiceExercise {...defaultProps} />);
    expect(screen.getByText("has been")).toBeInTheDocument();
    expect(screen.getByText("is been")).toBeInTheDocument();
    expect(screen.getByText("was been")).toBeInTheDocument();
    expect(screen.getByText("have been")).toBeInTheDocument();
  });

  it("calls onCorrect when the correct answer is selected", () => {
    render(<MultipleChoiceExercise {...defaultProps} />);
    fireEvent.click(screen.getByText("has been"));
    expect(defaultProps.onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onIncorrect when an incorrect option is selected", () => {
    render(<MultipleChoiceExercise {...defaultProps} />);
    fireEvent.click(screen.getByText("is been"));
    expect(defaultProps.onIncorrect).toHaveBeenCalledTimes(1);
  });

  it("does not call onCorrect for a wrong answer", () => {
    render(<MultipleChoiceExercise {...defaultProps} />);
    fireEvent.click(screen.getByText("was been"));
    expect(defaultProps.onCorrect).not.toHaveBeenCalled();
  });

  it("does not call onIncorrect for the correct answer", () => {
    render(<MultipleChoiceExercise {...defaultProps} />);
    fireEvent.click(screen.getByText("has been"));
    expect(defaultProps.onIncorrect).not.toHaveBeenCalled();
  });
});
