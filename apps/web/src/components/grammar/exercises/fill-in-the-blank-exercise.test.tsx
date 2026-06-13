/**
 * FillInTheBlankExercise — unit tests (Vitest + Testing Library)
 *
 * RED scaffold — FillInTheBlankExercise component does not exist yet.
 * Import will fail until Plan 04-03 implements the component.
 *
 * Asserts:
 * 1. Prompt is rendered
 * 2. A text input is present
 * 3. Case-insensitive + trimmed correct answer calls onCorrect
 * 4. Wrong answer calls onIncorrect
 * 5. Submit button or Enter key triggers evaluation
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FillInTheBlankExercise } from "../fill-in-the-blank-exercise";

describe("FillInTheBlankExercise", () => {
  const defaultProps = {
    question: {
      id: "q-002",
      exerciseType: "FILL_IN_THE_BLANK" as const,
      prompt: "He ___ (work) at this company for ten years.",
      answer: "has worked",
      distractors: [],
      explanation: "Third-person singular uses 'has' + past participle.",
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
    render(<FillInTheBlankExercise {...defaultProps} />);
    expect(
      screen.getByText(/He ___ \(work\) at this company/),
    ).toBeInTheDocument();
  });

  it("renders a text input field", () => {
    render(<FillInTheBlankExercise {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onCorrect for exact answer match", () => {
    render(<FillInTheBlankExercise {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "has worked" } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onCorrect for answer with leading/trailing whitespace (trimmed)", () => {
    render(<FillInTheBlankExercise {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  has worked  " } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onCorrect for case-insensitive answer (Has Worked)", () => {
    render(<FillInTheBlankExercise {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Has Worked" } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onCorrect for mixed-case trimmed (  Has Been  → has been)", () => {
    const propsWithHasBeen = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        answer: "has been",
      },
    };
    render(<FillInTheBlankExercise {...propsWithHasBeen} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Has Been " } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onIncorrect for wrong answer", () => {
    render(<FillInTheBlankExercise {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "have worked" } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onIncorrect).toHaveBeenCalledTimes(1);
  });

  it("does not call onCorrect for wrong answer", () => {
    render(<FillInTheBlankExercise {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "worked" } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onCorrect).not.toHaveBeenCalled();
  });
});
