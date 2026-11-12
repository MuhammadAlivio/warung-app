import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

const p2 = (n) => String(n).padStart(2, "0");

/** Bulan berjalan, format "YYYY-MM" (nilai input type="month"). */
export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
};

/** Periode awal: bulan berjalan. */
export const defaultPeriod = () => ({ mode: "month", month: currentMonth(), from: "", to: "" });
export const ALL_PERIOD = { mode: "all", month: "", from: "", to: "" };

/** Apakah tanggal "YYYY-MM-DD" masuk periode. Perbandingan string aman karena formatnya ISO. */
export function inPeriod(date, period) {
  if (!period || period.mode === "all") return true;
  if (!date) return false;
  if (period.mode === "month") return date.slice(0, 7) === period.month;
  return (!period.from || date >= period.from) && (!period.to || date <= period.to);
}

const fmtMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};
const fmtDate = (d) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export function periodLabel(period) {
  if (period.mode === "month") return fmtMonth(period.month);
  if (period.mode === "range") {
    if (period.from && period.to) return period.from === period.to ? fmtDate(period.from) : `${fmtDate(period.from)} – ${fmtDate(period.to)}`;
    if (period.from) return `Sejak ${fmtDate(period.from)}`;
    if (period.to) return `Sampai ${fmtDate(period.to)}`;
  }
  return "Semua periode";
}

const MODES = [
  { id: "month", label: "Per bulan" },
  { id: "range", label: "Rentang tanggal" },
  { id: "all", label: "Semua" },
];

const FIELD =
  "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

/**
 * Tombol filter periode faktur pembelian (FR-PUR-04): per bulan atau rentang tanggal.
 * Pilihan disimpan sebagai draf di panel dan baru dipakai saat "Terapkan" ditekan.
 */
export default function PeriodFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    if (open) setDraft({ ...value, month: value.month || currentMonth() });
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rangeError =
    draft.mode === "range" && draft.from && draft.to && draft.from > draft.to ? "Tanggal akhir tidak boleh sebelum tanggal awal." : "";
  const incomplete = (draft.mode === "month" && !draft.month) || (draft.mode === "range" && !draft.from && !draft.to);

  const apply = () => {
    if (rangeError || incomplete) return;
    onChange(draft.mode === "all" ? ALL_PERIOD : draft);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50",
          open ? "border-brand-600" : "border-neutral-200"
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
        {periodLabel(value)}
        <ChevronDown className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
      </button>

      {open && (
        <div role="dialog" aria-label="Filter periode" className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">
          <div role="tablist" className="flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-semibold">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={draft.mode === m.id}
                onClick={() => setDraft((d) => ({ ...d, mode: m.id }))}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 transition-colors",
                  draft.mode === m.id ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-3">
            {draft.mode === "month" && (
              <label className="block text-[11px] font-semibold text-neutral-700">
                Bulan
                <input type="month" value={draft.month} onChange={(e) => setDraft((d) => ({ ...d, month: e.target.value }))} className={cn(FIELD, "mt-1")} />
              </label>
            )}
            {draft.mode === "range" && (
              <>
                <label className="block text-[11px] font-semibold text-neutral-700">
                  Dari tanggal
                  <input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className={cn(FIELD, "mt-1")} />
                </label>
                <label className="block text-[11px] font-semibold text-neutral-700">
                  Sampai tanggal
                  <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className={cn(FIELD, "mt-1")} />
                </label>
                {rangeError
                  ? <p role="alert" className="text-[11px] text-red-600">{rangeError}</p>
                  : <p className="text-[11px] text-neutral-500">Boleh isi salah satu saja untuk rentang terbuka.</p>}
              </>
            )}
            {draft.mode === "all" && <p className="text-[11px] text-neutral-500">Tampilkan faktur dari semua tanggal.</p>}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => setDraft(defaultPeriod())} className="text-[11px] font-semibold text-brand-700 hover:underline">
              Bulan ini
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!!rangeError || incomplete}
              className="h-9 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
