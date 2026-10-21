import { forwardRef, useId } from "react";
import { Check } from "lucide-react";
import { cn } from "../../utils/cn";

const Checkbox = forwardRef(function Checkbox({ label, error, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2 text-xs text-neutral-700">
        <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "peer h-4 w-4 cursor-pointer appearance-none rounded border bg-white transition-colors",
              "checked:border-brand-600 checked:bg-brand-600",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20",
              error ? "border-red-400" : "border-neutral-300"
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden
          />
        </span>
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

export default Checkbox;
