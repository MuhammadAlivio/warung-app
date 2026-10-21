import { cn } from "../../lib/cn";

/**
 * Padding bawaan p-6 hanya dipakai bila className tidak menentukan padding sendiri (p-0, p-4, p-5, ...).
 * Dua kelas padding sekaligus bentrok di Tailwind: yang menang ditentukan urutan CSS, bukan urutan penulisan.
 */
export default function Card({ className, children, ...props }) {
  const hasOwnPadding = /(^|\s)p-\d/.test(className ?? "");
  return (
    <div
      className={cn("rounded-xl border border-neutral-100 bg-white shadow-sm", !hasOwnPadding && "p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
