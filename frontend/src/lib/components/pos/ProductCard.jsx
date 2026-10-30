import { useState } from "react";
import { Check, Package, Plus } from "lucide-react";
import { cn } from "../../utils/cn";
import { formatRupiah } from "../../utils/pos";

export default function ProductCard({ product, inCart, onAdd }) {
  const [broken, setBroken] = useState(false);
  const out = product.stock <= 0;
  return (
    <div className={cn("rounded-xl border bg-white p-3 transition", inCart ? "border-brand-600 ring-1 ring-brand-600" : "border-neutral-100 shadow-sm", out && "opacity-50")}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
        {broken || !product.image ? (
          <div className="flex h-full items-center justify-center text-neutral-400"><Package className="h-10 w-10" aria-hidden /></div>
        ) : (
          <img src={product.image} alt={product.name} onError={() => setBroken(true)} className="h-full w-full object-cover" />
        )}
        {inCart && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-neutral-900">{product.name}</h3>
      <p className="text-xs text-neutral-500">{product.unit} · Stok {product.stock}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-neutral-900">{formatRupiah(product.price)}</span>
        <button
          type="button" disabled={out} onClick={() => onAdd(product)} aria-label={`Tambah ${product.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
