import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Modal dengan header (judul, deskripsi, tombol X), isi, dan footer.
 * Susun isi dengan <ModalBody> dan <ModalFooter>.
 * Tutup lewat Esc, klik area gelap, atau tombol X. Scroll halaman dikunci saat terbuka.
 */
export default function Modal({ open, onClose, title, description, showClose = true, children, className }) {
  const panelRef = useRef(null);
  // Simpan onClose di ref agar effect tidak jalan ulang (dan mencuri fokus) tiap parent re-render
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKeyDown = (e) => e.key === "Escape" && onCloseRef.current?.();
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "flex max-h-[90vh] w-full max-w-[460px] flex-col rounded-xl bg-white shadow-xl focus:outline-none",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-neutral-900">{title}</h2>
            {description && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{description}</p>}
          </div>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ModalBody({ className, children }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)}>{children}</div>;
}

export function ModalFooter({ className, children }) {
  return (
    <div className={cn("flex items-center gap-2 border-t border-neutral-100 px-6 py-4", className)}>{children}</div>
  );
}
