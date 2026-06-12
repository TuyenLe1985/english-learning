/**
 * review-card.test.tsx — Unit tests for ReviewCard component.
 *
 * Tests:
 *   - Card renders word on front face
 *   - "Show answer" button is visible before flip
 *   - "Show answer" click calls onFlip
 *   - Definition is in DOM (back face hidden via CSS, not unmounted)
 *   - RatingButtons appear after flip (via parent passing isFlipped=true)
 *   - RatingButtons render with correct aria-labels
 *
 * VOCAB-06: Verify flip mechanic and rating buttons display.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewCard } from "./review-card";
import { RatingButtons } from "./rating-buttons";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("ReviewCard", () => {
  const defaultProps = {
    word: "ephemeral",
    definition: "Lasting for a very short time.",
    example: "The ephemeral beauty of cherry blossoms.",
    isFlipped: false,
    onFlip: vi.fn(),
  };

  it("renders the word on the front face", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("ephemeral")).toBeTruthy();
  });

  it("shows the 'Show answer' button before flip", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("Show answer")).toBeTruthy();
  });

  it("calls onFlip when 'Show answer' is clicked", () => {
    const onFlip = vi.fn();
    render(<ReviewCard {...defaultProps} onFlip={onFlip} />);
    fireEvent.click(screen.getByText("Show answer"));
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it("definition is always in the DOM (back face)", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("Lasting for a very short time.")).toBeTruthy();
  });

  it("has aria-pressed=false before flip", () => {
    render(<ReviewCard {...defaultProps} isFlipped={false} />);
    // The motion.div has aria-pressed
    const cards = document.querySelectorAll('[aria-pressed]');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    expect(firstCard).toBeDefined();
    expect(firstCard!.getAttribute("aria-pressed")).toBe("false");
  });

  it("has aria-pressed=true after flip", () => {
    render(<ReviewCard {...defaultProps} isFlipped={true} />);
    const cards = document.querySelectorAll('[aria-pressed]');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    expect(firstCard).toBeDefined();
    expect(firstCard!.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("RatingButtons", () => {
  it("renders all 4 rating buttons", () => {
    render(<RatingButtons onRate={vi.fn()} />);
    expect(screen.getByText("Again")).toBeTruthy();
    expect(screen.getByText("Hard")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Easy")).toBeTruthy();
  });

  it("renders with correct aria-labels", () => {
    render(<RatingButtons onRate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Rate as Again" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rate as Hard" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rate as Good" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rate as Easy" })).toBeTruthy();
  });

  it("calls onRate with the correct rating on click", () => {
    const onRate = vi.fn();
    render(<RatingButtons onRate={onRate} />);
    fireEvent.click(screen.getByRole("button", { name: "Rate as Good" }));
    expect(onRate).toHaveBeenCalledWith("Good");
  });

  it("disables all buttons when disabled=true", () => {
    render(<RatingButtons onRate={vi.fn()} disabled={true} />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
