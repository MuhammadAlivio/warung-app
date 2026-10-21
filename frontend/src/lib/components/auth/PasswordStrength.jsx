import { cn } from "../../utils/cn";

/** Hitung kekuatan password: 0 (kosong) – 3 (kuat). */
export function getPasswordScore(password = "") {
  if (!password) return 0;
  const longEnough = password.length >= 12;
  const hasMix = /[A-Za-z]/.test(password) && /\d/.test(password);
  const hasExtra = /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password));

  if (longEnough && hasMix && hasExtra) return 3;
  if (longEnough && hasMix) return 3;
  if (password.length >= 8 && hasMix) return 2;
  return 1;
}

const LABELS = {
  0: "Password min. 12 karakter, huruf & angka",
  1: "Password lemah · min. 12 karakter, huruf & angka",
  2: "Password sedang · min. 12 karakter, huruf & angka",
  3: "Password kuat · min. 12 karakter, huruf & angka",
};

const COLORS = { 1: "bg-red-400", 2: "bg-amber-400", 3: "bg-brand-600" };

export default function PasswordStrength({ password }) {
  const score = getPasswordScore(password);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-0.5 flex-1 rounded-full transition-colors", i <= score ? COLORS[score] : "bg-neutral-200")}
          />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-neutral-500">{LABELS[score]}</p>
    </div>
  );
}
