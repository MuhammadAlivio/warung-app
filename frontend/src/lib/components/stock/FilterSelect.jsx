/**
 * Filter ringkas berbentuk tombol dengan ikon di kiri (sesuai desain).
 * Pakai <select> native supaya aksesibel di keyboard dan mobile.
 */
export default function FilterSelect({ icon: Icon, label, placeholder, options, value, onChange }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" aria-hidden />
      <select
        value={value}
        onChange={onChange}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
