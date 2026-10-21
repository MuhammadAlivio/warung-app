import { cn } from "../../lib/cn";

/** Indikator langkah berbentuk bar. `current` dimulai dari 1. */
export default function Stepper({ steps, current, className }) {
  return (
    <ol
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} aria-current={n === current ? "step" : undefined}>
            <span className={cn("block h-0.5 rounded-full", n <= current ? "bg-brand-600" : "bg-neutral-200")} />
            <span
              className={cn(
                "mt-2 block text-[10px]",
                n === current ? "font-semibold text-neutral-900" : "text-neutral-500"
              )}
            >
              {n}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
