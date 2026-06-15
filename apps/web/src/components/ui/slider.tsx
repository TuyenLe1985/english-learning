'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

// ─── Slider (shadcn-compatible API wrapping base-ui Slider) ───────────────────

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  className?: string;
  'aria-label'?: string;
}

function Slider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onValueChange,
  onValueCommit,
  className,
  'aria-label': ariaLabel,
}: SliderProps) {
  // base-ui Slider uses single number for single thumb; wrap array API to match shadcn
  const baseValue =
    value !== undefined ? value[0] : undefined;
  const baseDefaultValue =
    defaultValue !== undefined ? defaultValue[0] : undefined;

  return (
    <SliderPrimitive.Root
      value={baseValue}
      defaultValue={baseDefaultValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v: number | number[]) => {
        const arr = Array.isArray(v) ? v : [v];
        onValueChange?.(arr);
      }}
      onValueCommitted={(v: number | number[]) => {
        const arr = Array.isArray(v) ? v : [v];
        onValueCommit?.(arr);
      }}
      className={cn('relative flex w-full touch-none items-center', className)}
    >
      <SliderPrimitive.Control className="relative flex w-full items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Indicator className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={ariaLabel}
          className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
