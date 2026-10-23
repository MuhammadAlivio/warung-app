import { cn } from "../../utils/cn";

const variants = {
  brand: "bg-brand-50 text-brand-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-neutral-100 text-neutral-600",
  success: "bg-green-50 text-green-700",
  info: "bg-amber-50 text-amber-700",
};

export default function Badge({ variant = "brand", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
        variants[variant] ?? variants.neutral,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
