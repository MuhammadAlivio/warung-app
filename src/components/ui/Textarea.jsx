import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

const Textarea = forwardRef(function Textarea({ label, error, className, id, rows = 3, ...props }, ref) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-xs font-semibold text-neutral-900">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(
          "w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-900",
          "placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-4",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
            : "border-neutral-200 focus:border-brand-600 focus:ring-brand-600/15"
        )}
        {...props}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

export default Textarea;
