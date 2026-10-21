import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

/** Daftar nomor halaman dengan elipsis, mis. [1, 2, 3, "…", 9]. */
export function getPageItems(page, pageCount) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, "…", pageCount];
  if (page >= pageCount - 2) return [1, "…", pageCount - 2, pageCount - 1, pageCount];
  return [1, "…", page - 1, page, page + 1, "…", pageCount];
}

const base =
  "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15";

export default function Pagination({ page, pageCount, total, pageSize, onChange, itemLabel = "data", className }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 text-[11px] text-neutral-500", className)}>
      <p>
        Menampilkan {from}–{to} dari {total} {itemLabel}
      </p>
      <nav aria-label="Navigasi halaman" className="flex items-center gap-1">
        <button
          type="button"
          className={cn(base, "text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40")}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {getPageItems(page, pageCount).map((item, i) =>
          item === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-neutral-400" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                base,
                item === page ? "bg-brand-50 font-semibold text-brand-700" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className={cn(base, "text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40")}
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  );
}
