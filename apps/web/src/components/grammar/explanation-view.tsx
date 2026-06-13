"use client";

interface Props {
  explanation: string;
  examples: string[];
}

export function ExplanationView({ explanation, examples }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Grammar rule card — zinc-100 / dark:zinc-800 background per UI-SPEC D-05 */}
      <div className="rounded-xl bg-zinc-100 px-4 py-4 dark:bg-zinc-800">
        <p className="text-base font-semibold leading-relaxed text-foreground">
          {explanation}
        </p>
      </div>

      {examples.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">Examples</p>
          <ul className="flex flex-col gap-1">
            {examples.map((ex, i) => (
              <li
                key={i}
                className="ml-2 text-sm italic text-foreground"
              >
                • {ex}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
