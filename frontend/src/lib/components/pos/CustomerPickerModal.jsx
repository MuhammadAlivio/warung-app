import { useMemo, useState } from "react";
import { Check, Plus, Search, User } from "lucide-react";
import { Modal, ModalBody } from "../ui";
import { cn } from "../../utils/cn";
import { useCustomers } from "../../stores/CustomerContext";
import CustomerFormModal from "../pelanggan/CustomerFormModal";

export default function CustomerPickerModal({ open, onClose, selectedId, onSelect }) {
  const { customers, addCustomer } = useCustomers();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => customers.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())), [customers, q]);
  const pick = (c) => { onSelect(c); setQ(""); onClose(); };

  return (
    <>
      <Modal open={open && !adding} onClose={onClose} title="Pilih pelanggan">
        <ModalBody>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama pelanggan..."
              aria-label="Cari nama pelanggan"
              className="h-11 w-full rounded-lg border border-neutral-200 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
            />
          </div>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {list.map((c) => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button" onClick={() => pick(c)}
                    className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      active ? "border-transparent bg-brand-50 font-semibold text-brand-900" : "border-neutral-100 hover:bg-neutral-50")}
                  >
                    <User className={cn("h-4 w-4", active ? "text-brand-600" : "text-neutral-500")} aria-hidden />
                    <span className="flex-1">{c.name}</span>
                    {active && <Check className="h-4 w-4 text-brand-600" aria-hidden />}
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="py-6 text-center text-sm text-neutral-500">Pelanggan tidak ditemukan.</li>}
          </ul>
          <button
            type="button" onClick={() => setAdding(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            <Plus className="h-4 w-4" aria-hidden /> Tambah pelanggan
          </button>
        </ModalBody>
      </Modal>

      <CustomerFormModal
        open={open && adding} onClose={() => setAdding(false)}
        onSubmit={(v) => { const c = addCustomer(v); onSelect(c); setAdding(false); onClose(); }}
      />
    </>
  );
}
