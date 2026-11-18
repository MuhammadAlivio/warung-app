import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "../../utils/cn";

const norm = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Kotak "ketik & cari" untuk jenis / kategori kas.
 * Ketik untuk menyaring daftar; bila nama belum ada, muncul "+ Tambah "…"" di bawah daftar.
 *
 *   value     : pilihan saat ini ("" bila belum)
 *   options   : daftar nama
 *   onChange  : (nama) => void
 *   onAdd     : async (nama) => nama tersimpan (langsung dipilih), atau null bila pemanggil
 *               menyelesaikannya sendiri (mis. jenis baru perlu dipilih efeknya dulu);
 *               lempar Error bila gagal (pesan ditampilkan pemanggil)
 *   noun      : "kategori" / "jenis", untuk teks bantuan
 */
export default function CategoryCombobox({ id, value, options, onChange, onAdd, noun = "kategori", placeholder }) {
  placeholder ??= `Pilih atau ketik ${noun}…`;
  const listId = useId();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);

  // Kategori catatan lama yang sudah tidak ada di daftar tetap bisa dipertahankan
  const all = value && !options.includes(value) ? [...options, value] : options;
  const q = norm(query);
  const filtered = q ? all.filter((o) => norm(o).includes(q)) : all;
  const canAdd = q.length >= 2 && !all.some((o) => norm(o) === q);
  const items = [...filtered.map((name) => ({ type: "option", name })), ...(canAdd ? [{ type: "add", name: query.trim().replace(/\s+/g, " ") }] : [])];

  // Tutup bila klik di luar
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) close(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  function openList() {
    setOpen(true);
    setQuery("");
    // Sorot kategori yang sedang terpilih
    setActive(Math.max(0, all.indexOf(value)));
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  async function choose(item) {
    if (!item) return;
    if (item.type === "option") {
      onChange(item.name);
      close();
      return;
    }
    setAdding(true);
    try {
      const saved = await onAdd(item.name);
      close();
      if (saved) onChange(saved);
    } catch {
      // pesan error ditampilkan pemanggil; daftar tetap terbuka supaya bisa diperbaiki
    } finally {
      setAdding(false);
    }
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!adding) choose(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  }

  const activeId = open && items[active] ? `${listId}-${active}` : undefined;

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        maxLength={50}
        value={open ? query : value}
        placeholder={open && value ? value : placeholder}
        onChange={(e) => { if (!open) setOpen(true); setQuery(e.target.value); }}
        onFocus={() => { if (!open) openList(); }}
        onClick={() => { if (!open) openList(); }}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-3 pr-9 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? `Tutup daftar ${noun}` : `Buka daftar ${noun}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { if (open) close(); else { openList(); inputRef.current?.focus(); } }}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-neutral-400"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 text-xs shadow-lg"
        >
          {items.length === 0 && (
            <li className="px-3 py-2 text-neutral-400">Ketik minimal 2 huruf untuk menambah {noun} baru.</li>
          )}
          {items.map((item, i) => {
            const selected = item.type === "option" && item.name === value;
            return (
              <li
                key={`${item.type}-${item.name}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => !adding && choose(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2",
                  item.type === "add" && "border-t border-neutral-100 font-semibold text-brand-700",
                  i === active && "bg-brand-50",
                )}
              >
                {item.type === "add" ? (
                  <>
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{adding ? "Menambah…" : `Tambah "${item.name}"`}</span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-neutral-800">{item.name}</span>
                    {selected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
