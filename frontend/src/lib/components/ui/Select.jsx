import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

/** options: [{ value, label }] */
const Select = forwardRef(function Select(
  { label, error, options = [], placeholder, className, selectClassName, id, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-xs font-semibold text-neutral-900">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            "h-11 w-full appearance-none rounded-lg border bg-white pl-3 pr-9 text-sm text-neutral-900 transition-colors",
            "focus:outline-none focus:ring-4",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "border-neutral-200 focus:border-brand-600 focus:ring-brand-600/15",
            selectClassName
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          aria-hidden
        />
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
