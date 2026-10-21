import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

const Input = forwardRef(function Input(
  { label, error, hint, className, inputClassName, id, rightSlot, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-neutral-900">
          {label}
        </label>
      )}
      <div className="flex items-stretch gap-2">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-11 w-full min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm text-neutral-900",
            "placeholder:text-neutral-400 transition-colors",
            "focus:outline-none focus:ring-4",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "border-neutral-200 focus:border-brand-600 focus:ring-brand-600/15",
            inputClassName
          )}
          {...props}
        />
        {rightSlot}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
});

export default Input;
