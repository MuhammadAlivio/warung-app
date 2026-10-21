import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

const variants = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600/40 disabled:bg-brand-600/60",
  outline:
    "bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 focus-visible:ring-neutral-300",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/40 disabled:bg-red-600/60",
};

const sizes = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-4 text-xs",
};

const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = true, className, children, disabled, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed",
        sizes[size],
        fullWidth && "w-full",
        variants[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export default Button;
