import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Modal, ModalBody, ModalFooter } from "../ui";
import { useStock } from "../../stores/StockContext";
import { categorySchema } from "../../schemas/stock";

const iconBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15 disabled:cursor-not-allowed disabled:opacity-40";

/** Pesan pertama dari zod, atau null jika valid. */
const checkName = (name) => {
  const r = categorySchema.safeParse({ name });
  return r.success ? null : r.error.issues[0].message;
};

function CategoryRow({ category, onError }) {
  const { renameCategory, deleteCategory } = useStock();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const used = category.product_count ?? 0;

  const run = async (fn) => {
    setBusy(true);
    onError("");
    try {
      await fn();
    } catch (e) {
      onError(e.data?.errors?.name?.[0] ?? e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const problem = checkName(name);
    if (problem) return onError(problem);
    if (name.trim() === category.name) return setEditing(false);
    run(async () => {
      await renameCategory(category.id, name.trim());
      setEditing(false);
    });
  };

  return (
    <li className="flex items-center gap-2 border-b border-neutral-100 py-2 last:border-0">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setName(category.name); setEditing(false); }
          }}
          aria-label={`Nama baru untuk kategori ${category.name}`}
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
        />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{category.name}</p>
          <p className="text-[11px] text-neutral-500">{used} barang</p>
        </div>
      )}

      {editing ? (
        <>
          <button type="button" onClick={save} disabled={busy} aria-label="Simpan nama kategori" className={`${iconBtn} text-brand-700 hover:bg-brand-50`}>
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { setName(category.name); setEditing(false); }} disabled={busy} aria-label="Batal ubah" className={`${iconBtn} text-neutral-500 hover:bg-neutral-100`}>
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setEditing(true)} aria-label={`Ubah nama ${category.name}`} className={`${iconBtn} text-neutral-600 hover:bg-neutral-100`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => run(() => deleteCategory(category.id))}
            disabled={busy || used > 0}
            title={used > 0 ? "Kategori masih dipakai barang" : undefined}
            aria-label={`Hapus kategori ${category.name}`}
            className={`${iconBtn} text-red-600 hover:bg-red-50`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </li>
  );
}

/** Kelola jenis kategori barang (tambah, ubah nama, hapus yang tidak dipakai). */
export default function CategoryManagerModal({ open, onClose }) {
  const { categories, addCategory } = useStock();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    const problem = checkName(name);
    if (problem) return setError(problem);
    setAdding(true);
    setError("");
    try {
      await addCategory(name.trim());
      setName("");
    } catch (err) {
      setError(err.data?.errors?.name?.[0] ?? err.message);
    } finally {
      setAdding(false);
    }
  };

  const close = () => {
    setError("");
    setName("");
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Kelola Kategori" description="Tambah, ubah nama, atau hapus jenis kategori barang.">
      <ModalBody className="space-y-4">
        <form onSubmit={add} noValidate className="flex items-end gap-2">
          <Input
            label="Kategori baru"
            placeholder="Mis. Pakan Kucing"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            className="flex-1"
          />
          <Button type="submit" size="sm" fullWidth={false} loading={adding} className="h-11">
            <Plus className="h-4 w-4" aria-hidden /> Tambah
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {categories.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">Belum ada kategori.</p>
        ) : (
          <ul aria-label="Daftar kategori">
            {categories.map((c) => (
              <CategoryRow key={c.id} category={c} onError={setError} />
            ))}
          </ul>
        )}
        <p className="text-[11px] text-neutral-500">Kategori yang masih dipakai barang tidak bisa dihapus.</p>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="outline" size="sm" fullWidth={false} onClick={close}>
          Selesai
        </Button>
      </ModalFooter>
    </Modal>
  );
}
