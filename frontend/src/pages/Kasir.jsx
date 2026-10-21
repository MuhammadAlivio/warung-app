import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Minus, PackageSearch, Plus, Search, ShoppingBasket, Trash2 } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Button, Card } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { useStock } from "../lib/stores/StockContext";
import { CATEGORIES, getStockStatus } from "../lib/data/stockMockData";

const QUICK_CASH = [10000, 20000, 50000, 100000];

export default function Kasir() {
  const navigate = useNavigate();
  const { products, updateProduct } = useStock();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState({}); // { [productId]: qty }
  const [cash, setCash] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const lowCount = useMemo(() => products.filter((p) => getStockStatus(p).key === "low").length, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!category || p.category === category));
  }, [products, query, category]);

  const items = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
        .filter((i) => i.product),
    [cart, products]
  );
  const total = items.reduce((sum, i) => sum + i.product.sellPrice * i.qty, 0);
  const cashValue = Number(cash) || 0;
  const change = cashValue - total;
  const canPay = items.length > 0 && cashValue >= total;

  const setQty = (product, qty) => {
    const next = Math.max(0, Math.min(qty, product.stock));
    setCart((prev) => {
      const { [product.id]: _, ...rest } = prev;
      return next > 0 ? { ...rest, [product.id]: next } : rest;
    });
    setReceipt(null);
  };

  const pay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 500)); // TODO: panggilan API
    items.forEach(({ product, qty }) => updateProduct(product.id, { stock: product.stock - qty }));
    setReceipt({ total, cash: cashValue, change, count: items.reduce((n, i) => n + i.qty, 0) });
    setCart({});
    setCash("");
    setPaying(false);
  };

  return (
    <DashboardLayout breadcrumb="Kasir / POS" badges={{ stok: lowCount }} onLogout={() => navigate("/admin/login")}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Kasir / POS</h1>
          <p className="mt-1 text-xs text-neutral-500">Pilih barang, catat pembayaran, stok berkurang otomatis.</p>
        </div>

        {receipt && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2.5 text-xs text-brand-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              Transaksi berhasil: {receipt.count} barang, total {formatRupiah(receipt.total)}. Kembalian{" "}
              {formatRupiah(receipt.change)}.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="min-w-0 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Cari barang"
                  placeholder="Cari barang..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {["", ...CATEGORIES].map((c) => (
                <button
                  key={c || "semua"}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                    category === c ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  {c || "Semua"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((p) => {
                const inCart = cart[p.id] ?? 0;
                const soldOut = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={soldOut || inCart >= p.stock}
                    onClick={() => setQty(p, inCart + 1)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed",
                      inCart > 0 ? "border-brand-600 bg-brand-50" : "border-neutral-100 hover:bg-neutral-50",
                      soldOut && "opacity-50"
                    )}
                  >
                    <p className="line-clamp-2 min-h-[2rem] text-xs font-semibold text-neutral-900">{p.name}</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-brand-700">{formatRupiah(p.sellPrice)}</p>
                    <p className="mt-0.5 text-[10px] text-neutral-500">
                      {soldOut ? "Stok habis" : `Stok ${p.stock}`}
                      {inCart > 0 && ` · ${inCart} di keranjang`}
                    </p>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <PackageSearch className="h-8 w-8 text-neutral-400" aria-hidden />
                <p className="text-sm font-semibold text-neutral-700">Barang tidak ditemukan</p>
                <p className="text-xs text-neutral-500">Coba ubah kata kunci atau kategori.</p>
              </div>
            )}
          </Card>

          <Card className="flex h-fit flex-col p-4 lg:sticky lg:top-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShoppingBasket className="h-4 w-4" aria-hidden />
              Keranjang
            </h2>

            {items.length === 0 ? (
              <p className="py-8 text-center text-xs text-neutral-500">Belum ada barang dipilih.</p>
            ) : (
              <ul className="mb-3 divide-y divide-neutral-100">
                {items.map(({ product, qty }) => (
                  <li key={product.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-neutral-900">{product.name}</p>
                      <button
                        type="button"
                        aria-label={`Hapus ${product.name} dari keranjang`}
                        onClick={() => setQty(product, 0)}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Kurangi"
                          onClick={() => setQty(product, qty - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50"
                        >
                          <Minus className="h-3 w-3" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-xs tabular-nums">{qty}</span>
                        <button
                          type="button"
                          aria-label="Tambah"
                          disabled={qty >= product.stock}
                          onClick={() => setQty(product, qty + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                      <p className="text-xs font-semibold tabular-nums">{formatRupiah(product.sellPrice * qty)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-neutral-100 pt-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Total</span>
                <span className="text-lg font-bold tabular-nums">{formatRupiah(total)}</span>
              </div>

              <label htmlFor="uang-diterima" className="mb-1 block text-[11px] font-medium text-neutral-600">
                Uang diterima
              </label>
              <input
                id="uang-diterima"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs tabular-nums focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCash(String(total))}
                  disabled={total === 0}
                  className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200 disabled:opacity-40"
                >
                  Uang pas
                </button>
                {QUICK_CASH.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCash(String(n))}
                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200"
                  >
                    {formatRupiah(n)}
                  </button>
                ))}
              </div>

              <div className="my-3 flex items-center justify-between text-xs">
                <span className="text-neutral-500">Kembalian</span>
                <span className={cn("font-semibold tabular-nums", change < 0 && cashValue > 0 && "text-red-600")}>
                  {items.length > 0 && cashValue > 0 ? formatRupiah(Math.max(change, 0)) : "-"}
                </span>
              </div>
              {items.length > 0 && cashValue > 0 && change < 0 && (
                <p className="mb-2 text-[11px] text-red-600">Uang kurang {formatRupiah(-change)}.</p>
              )}

              <Button disabled={!canPay} loading={paying} onClick={pay}>
                Bayar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
