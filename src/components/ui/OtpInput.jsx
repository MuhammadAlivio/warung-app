import { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Input OTP N digit dengan auto-focus antar kotak.
 * - Mengetik angka → pindah ke kotak berikutnya
 * - Backspace di kotak kosong → hapus & mundur ke kotak sebelumnya
 * - Panah kiri/kanan untuk pindah kotak
 * - Paste kode penuh (atau autofill SMS/authenticator) langsung terisi
 *
 * Controlled: value (string angka), onChange(string), onComplete(string) opsional.
 * Kompatibel dengan react-hook-form lewat <Controller />.
 */
export default function OtpInput({
  value = "",
  onChange,
  onComplete,
  length = 6,
  error,
  disabled = false,
  autoFocus = true,
  label,
  className,
}) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusAt = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const commit = (next) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange?.(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const handleChange = (i, e) => {
    const digits = e.target.value.replace(/\D/g, "");

    // Kotak dikosongkan
    if (!digits) {
      commit(value.slice(0, i) + value.slice(i + 1));
      return;
    }

    // Satu digit → ganti di posisi i; banyak digit (autofill) → isi mulai posisi i
    const next =
      digits.length === 1 ? value.slice(0, i) + digits + value.slice(i + 1) : value.slice(0, i) + digits;

    commit(next);
    focusAt(i + digits.length);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      commit(value.slice(0, i - 1) + value.slice(i));
      focusAt(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const clean = commit(text);
    focusAt(clean.length);
  };

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-xs font-semibold text-neutral-900">{label}</p>}

      <div role="group" aria-label={label ?? "Kode OTP"} className="flex gap-2">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={value[i] ?? ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            // Cegah loncat ke kotak kosong di tengah (hindari "lubang" pada kode)
            onClick={() => i > value.length && focusAt(value.length)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            placeholder="–"
            maxLength={length}
            disabled={disabled}
            aria-label={`Digit ${i + 1} dari ${length}`}
            aria-invalid={!!error}
            className={cn(
              "h-12 min-w-0 flex-1 rounded-lg border bg-white text-center text-lg font-semibold text-neutral-900",
              "placeholder:font-normal placeholder:text-neutral-400 transition-colors",
              "focus:outline-none focus:ring-4",
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                : "border-neutral-200 focus:border-brand-600 focus:ring-brand-600/15",
              disabled && "cursor-not-allowed bg-neutral-50"
            )}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
