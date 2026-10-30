import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Search } from "lucide-react";
import { GENERAL_CUSTOMER } from "../lib/data/posMockData";
import { formatTanggal, printDoc, toInputDate } from "../lib/utils/pos";
import { cn } from "../lib/utils/cn";
import { CATEGORIES } from "../lib/data/stockMockData";
import { useFinance } from "../lib/stores/FinanceContext";
import AdminShell from "../lib/components/layout/AdminShell";
import { useCart } from "../lib/hooks/useCart";
import { useCatalog, useStockAdjust } from "../lib/hooks/useCatalog";
import { useTransactions } from "../lib/stores/TransactionContext";
import ProductCard from "../lib/components/pos/ProductCard";
import CartPanel from "../lib/components/pos/CartPanel";
import CustomerPickerModal from "../lib/components/pos/CustomerPickerModal";
import PaymentSuccess from "../lib/components/pos/PaymentSuccess";

function KasirContent() {
  const navigate = useNavigate();
  const cart = useCart();
  const { nextNo, nextSeq, addTransaction } = useTransactions();
  const searchRef = useRef(null);
  const catalog = useCatalog();
  const adjustStock = useStockAdjust();
  const { addEntry } = useFinance();
  const [category, setCategory] = useState("");

  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState(GENERAL_CUSTOMER);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [method, setMethod] = useState("Tunai");
  const [cash, setCash] = useState(0);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [printInvoice, setPrintInvoice] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const isGeneral = customer.id === GENERAL_CUSTOMER.id;
  const change = Math.max(cash - cart.total, 0);
  const remaining = Math.max(cart.total - cash, 0);

  useEffect(() => {
    const h = (e) => { if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!category || p.category === category));
  }, [query, category, catalog]);
  const inCart = useMemo(() => new Set(cart.items.map((i) => i.id)), [cart.items]);

  const finalize = (cashValue) => {
    const now = new Date();
    const paidValue = Math.min(cashValue, cart.total);
    const tx = {
      id: `t${nextSeq}`, seq: nextSeq, no: nextNo(), date: now,
      customer, method, items: cart.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total: cart.total, paid: paidValue, cancelled: false,
      cash: cashValue, change: Math.max(cashValue - cart.total, 0),
      payments: paidValue > 0 ? [{ date: now, method, amount: paidValue, note: "Pembayaran awal" }] : [],
      history: [], printReceipt, printInvoice,
    };
    addTransaction(tx);
    if (paidValue > 0)
      addEntry({ type: "masuk", category: "Penjualan", amount: paidValue, date: toInputDate(now), description: `Penjualan #${tx.no}`, createdBy: "Kasir" });
    adjustStock(Object.fromEntries(tx.items.map((i) => [i.id, -i.qty])));
    setDone(tx);
    setTimeout(() => {
      if (printReceipt) printDoc("receipt");
      if (printInvoice) printDoc("invoice");
    }, 400);
  };

  const pay = () => {
    if (!cart.items.length) return;
    if (cash <= 0) return setError("Masukkan nominal uang yang diterima.");
    if (remaining > 0 && isGeneral) return setError("Uang kurang. Pilih pelanggan untuk mencatat sisa tagihan.");
    setError("");
    finalize(cash);
  };

  // "Simpan transaksi" = catat sebagai tagihan belum lunas (wajib pelanggan terdaftar)
  const save = () => {
    if (isGeneral) return setError("Pilih pelanggan untuk menyimpan transaksi belum lunas.");
    setError("");
    finalize(0);
  };

  const reset = () => {
    cart.clear(); setCash(0); setCustomer(GENERAL_CUSTOMER); setMethod("Tunai"); setError(""); setQuery(""); setDone(null);
  };

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kasir / POS</h1>
          <p className="mt-1 text-xs text-neutral-500">Transaksi lebih cepat, pelanggan lebih dekat.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-neutral-600" aria-hidden /> {formatTanggal(new Date())}
        </div>
      </header>

      {done ? (
        <PaymentSuccess tx={done} onNew={reset} onHistory={() => navigate("/admin/riwayat-transaksi")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
              <input
                ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari barang"
                placeholder="Cari nama barang atau pindai barcode...  F2"
                className="h-12 w-full rounded-lg border border-neutral-200 bg-white pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["", ...CATEGORIES].map((c) => (
                <button
                  key={c || "semua"} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
                  className={cn("rounded-full px-3 py-1 text-[11px] font-medium transition-colors", category === c ? "bg-brand-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-200")}
                >
                  {c || "Semua"}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} inCart={inCart.has(p.id)} onAdd={cart.add} />)}
              {products.length === 0 && <p className="col-span-full py-12 text-center text-sm text-neutral-500">Barang tidak ditemukan. Coba ubah kata kunci atau kategori.</p>}
            </div>
          </section>

          <CartPanel
            trxNo={nextNo()} cart={cart} customer={customer} onPickCustomer={() => setPickerOpen(true)}
            method={method} setMethod={setMethod} cash={cash} setCash={(v) => { setCash(v); setError(""); }}
            printReceipt={printReceipt} setPrintReceipt={setPrintReceipt}
            printInvoice={printInvoice} setPrintInvoice={setPrintInvoice}
            change={change} remaining={remaining} error={error} onPay={pay} onSave={save}
          />
        </div>
      )}

      <CustomerPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} selectedId={customer.id} onSelect={(c) => { setCustomer(c); setError(""); }} />
    </div>
  );
}

export default function Kasir() {
  return (
    <AdminShell breadcrumb="Kasir / POS">
      <KasirContent />
    </AdminShell>
  );
}
