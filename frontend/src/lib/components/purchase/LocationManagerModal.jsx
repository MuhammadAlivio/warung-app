import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Modal, ModalBody, ModalFooter } from "../ui";
import { usePurchase } from "../../stores/PurchaseContext";

const iconBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15 disabled:cursor-not-allowed disabled:opacity-40";

/** Pesan error jika nama tidak valid (aturan sama dengan backend), atau null. */
const checkName = (name) => {
  const v = name.trim();
  if (!v) return "Nama lokasi wajib diisi";
  if (v.length > 50) return "Nama lokasi maksimal 50 karakter";
  return null;
};

const apiMessage = (e) => e.data?.errors?.name?.[0] ?? e.message;

function LocationRow({ location, onError }) {
  const { renameLocation, deleteLocation } = usePurchase();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const [busy, setBusy] = useState(false);
  const used = location.purchase_count ?? 0;

  const run = async (fn) => {
    setBusy(true);
    onError("");
    try {
      await fn();
    } catch (e) {
      onError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setName(location.name);
    setEditing(false);
  };

  const save = () => {
    const problem = checkName(name);
    if (problem) return onError(problem);
    if (name.trim() === location.name) return setEditing(false);
    run(async () => {
      await renameLocation(location.id, name.trim());
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
            if (e.key === "Escape") cancel();
          }}
          aria-label={`Nama baru untuk lokasi ${location.name}`}
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
        />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{location.name}</p>
          <p className="text-[11px] text-neutral-500">{used} faktur</p>
        </div>
      )}

      {editing ? (
        <>
          <button type="button" onClick={save} disabled={busy} aria-label="Simpan nama lokasi" className={`${iconBtn} text-brand-700 hover:bg-brand-50`}>
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={cancel} disabled={busy} aria-label="Batal ubah" className={`${iconBtn} text-neutral-500 hover:bg-neutral-100`}>
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setEditing(true)} aria-label={`Ubah nama ${location.name}`} className={`${iconBtn} text-neutral-600 hover:bg-neutral-100`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => run(() => deleteLocation(location.id))}
            disabled={busy || used > 0}
            title={used > 0 ? "Lokasi masih dipakai faktur pembelian" : undefined}
            aria-label={`Hapus lokasi ${location.name}`}
            className={`${iconBtn} text-red-600 hover:bg-red-50`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </li>
  );
}

/** Kelola daftar lokasi penerimaan barang (tambah, ganti nama, hapus yang tidak dipakai faktur). */
export default function LocationManagerModal({ open, onClose, onAdded }) {
  const { locations, addLocation } = usePurchase();
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
      const l = await addLocation(name.trim());
      setName("");
      onAdded?.(l);
    } catch (err) {
      setError(apiMessage(err));
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
    <Modal open={open} onClose={close} title="Kelola lokasi penerimaan" description="Tambah, ubah nama, atau hapus lokasi tempat barang diterima.">
      <ModalBody className="space-y-4">
        <form onSubmit={add} noValidate className="flex items-end gap-2">
          <Input
            label="Lokasi baru"
            placeholder="Mis. Gudang belakang"
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

        {locations.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">Belum ada lokasi.</p>
        ) : (
          <ul aria-label="Daftar lokasi penerimaan">
            {locations.map((l) => (
              <LocationRow key={l.id} location={l} onError={setError} />
            ))}
          </ul>
        )}
        <p className="text-[11px] text-neutral-500">
          Lokasi yang masih dipakai faktur tidak bisa dihapus. Mengganti nama tidak mengubah faktur lama, hanya nama yang tampil.
        </p>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="outline" size="sm" fullWidth={false} onClick={close}>
          Selesai
        </Button>
      </ModalFooter>
    </Modal>
  );
}
