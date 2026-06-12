/**
 * FlashcardExercise — unit tests (Vitest + Testing Library)
 *
 * Asserts:
 * 1. Card renders with word on front (not flipped)
 * 2. Clicking card flips it (aria-pressed toggles to true)
 * 3. After flip, definition becomes accessible
 * 4. onCorrect callback fires when "Got it!" is clicked (after flip)
 * 5. onIncorrect callback fires when "Didn't know it" is clicked (after flip)
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlashcardExercise } from "./flashcard-exercise";

// Mock framer-motion to avoid animation side effects in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      onClick,
      onKeyDown,
      "aria-pressed": ariaPressed,
      role,
      tabIndex,
    }: React.HTMLAttributes<HTMLDivElement> & {
      "aria-pressed"?: boolean;
    }) => (
      <div
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-pressed={ariaPressed}
        role={role}
        tabIndex={tabIndex}
        data-testid="flashcard-container"
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("FlashcardExercise", () => {
  const defaultProps = {
    word: "ephemeral",
    definition: "Lasting for a very short time",
    onCorrect: vi.fn(),
    onIncorrect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the word on the front face initially", () => {
    render(<FlashcardExercise {...defaultProps} />);
    expect(screen.getByText("ephemeral")).toBeInTheDocument();
  });

  it("starts with aria-pressed=false (card not flipped)", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles aria-pressed to true when card is clicked (flip)", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the definition in the back face (always in DOM, hidden via CSS)", () => {
    render(<FlashcardExercise {...defaultProps} />);
    // The definition is always in the DOM (back face) — just visually hidden before flip
    expect(screen.getByText("Lasting for a very short time")).toBeInTheDocument();
  });

  it("shows action buttons after flipping the card", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    fireEvent.click(card);
    expect(screen.getByText(/Got it/i)).toBeInTheDocument();
    expect(screen.getByText(/Didn't know it/i)).toBeInTheDocument();
  });

  it("calls onCorrect when 'Got it!' button is clicked", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    fireEvent.click(card);
    fireEvent.click(screen.getByText(/Got it/i));
    expect(defaultProps.onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onIncorrect when 'Didn't know it' button is clicked", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    fireEvent.click(card);
    fireEvent.click(screen.getByText(/Didn't know it/i));
    expect(defaultProps.onIncorrect).toHaveBeenCalledTimes(1);
  });

  it("responds to Enter key to flip the card", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("responds to Space key to flip the card", () => {
    render(<FlashcardExercise {...defaultProps} />);
    const card = screen.getByTestId("flashcard-container");
    fireEvent.keyDown(card, { key: " " });
    expect(card).toHaveAttribute("aria-pressed", "true");
  });
});
