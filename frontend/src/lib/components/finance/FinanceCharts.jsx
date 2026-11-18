import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../ui";
import { formatRupiah } from "../../utils/format";
import { cn } from "../../utils/cn";

// Warna sama dengan teks di halaman Keuangan: masuk text-green-600, keluar text-red-600, saldo brand-600
const COLOR_IN = "#16a34a";
const COLOR_OUT = "#dc2626";
const COLOR_BALANCE = "#3b7658";
const AXIS = { fontSize: 11, fill: "#737373" };

const toDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Angka sumbu ringkas: 1,5 jt / 250 rb. */
function compactRupiah(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return `${sign}${abs}`;
}

/** Label sumbu X: per hari "Sen 3", per minggu "Minggu 1". */
function axisLabel(row, perWeek) {
  if (perWeek) return row.label;
  const d = toDate(row.start);
  return `${d.toLocaleDateString("id-ID", { weekday: "short" })} ${d.getDate()}`;
}

function rangeText(row, perWeek) {
  const fmt = (iso) => toDate(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return perWeek ? `${row.label} · ${fmt(row.start)} – ${fmt(row.end)}` : toDate(row.start).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function ChartTooltip({ active, payload, mode, perWeek }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const net = row.kas_masuk - row.kas_keluar;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-neutral-900">{rangeText(row, perWeek)}</p>
      {mode === "cash" ? (
        <div className="space-y-0.5 tabular-nums">
          <p className="flex justify-between gap-4"><span className="text-neutral-500">Kas masuk</span><span className="text-green-600">{formatRupiah(row.kas_masuk)}</span></p>
          <p className="flex justify-between gap-4"><span className="text-neutral-500">Kas keluar</span><span className="text-red-600">{formatRupiah(row.kas_keluar)}</span></p>
          <p className="flex justify-between gap-4 border-t border-neutral-100 pt-0.5 font-semibold">
            <span className="text-neutral-700">Arus bersih</span>
            <span className={net >= 0 ? "text-green-600" : "text-red-600"}>{net < 0 ? "− " : "+ "}{formatRupiah(Math.abs(net))}</span>
          </p>
        </div>
      ) : (
        <p className="flex justify-between gap-4 tabular-nums"><span className="text-neutral-500">Saldo akhir</span><span className="font-semibold text-neutral-900">{formatRupiah(row.saldo_akhir)}</span></p>
      )}
    </div>
  );
}

function EmptyChart({ children }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-neutral-400">{children}</div>;
}

/** Kartu grafik: tab "Arus kas" (batang masuk vs keluar) dan "Saldo" (tren saldo akhir). */
function CashflowChart({ rows, tab }) {
  const [mode, setMode] = useState("cash");
  const perWeek = tab === "bulanan";
  const data = rows.map((r) => ({ ...r, x: axisLabel(r, perWeek) }));
  const hasCash = rows.some((r) => r.kas_masuk > 0 || r.kas_keluar > 0);
  const subtitle = tab === "harian" ? "7 hari terakhir" : tab === "mingguan" ? "Per hari, minggu ini" : "Per minggu, bulan ini";

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Grafik keuangan</h2>
          <p className="text-[11px] text-neutral-400">{subtitle}</p>
        </div>
        <div role="tablist" aria-label="Jenis grafik" className="flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-semibold">
          {[["cash", "Arus kas"], ["balance", "Saldo"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn("rounded-md px-3 py-1 transition-colors", mode === id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "cash" && (
        <div className="mb-2 flex gap-4 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_IN }} />Kas masuk</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_OUT }} />Kas keluar</span>
        </div>
      )}

      <div className="h-60">
        {rows.length === 0 ? (
          <EmptyChart>Memuat grafik...</EmptyChart>
        ) : mode === "cash" && !hasCash ? (
          <EmptyChart>Belum ada kas masuk atau keluar pada periode ini.</EmptyChart>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {mode === "cash" ? (
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: "#e5e5e5" }} interval={0} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compactRupiah} width={52} />
                <Tooltip content={<ChartTooltip mode="cash" perWeek={perWeek} />} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="kas_masuk" name="Kas masuk" fill={COLOR_IN} radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {/* Harian: hari terpilih (batang terakhir) tegas, 6 hari sebelumnya lebih pudar */}
                  {data.map((_, i) => <Cell key={i} fillOpacity={tab === "harian" && i < data.length - 1 ? 0.45 : 1} />)}
                </Bar>
                <Bar dataKey="kas_keluar" name="Kas keluar" fill={COLOR_OUT} radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {data.map((_, i) => <Cell key={i} fillOpacity={tab === "harian" && i < data.length - 1 ? 0.45 : 1} />)}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_BALANCE} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={COLOR_BALANCE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: "#e5e5e5" }} interval={0} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compactRupiah} width={52} />
                <Tooltip content={<ChartTooltip mode="balance" perWeek={perWeek} />} />
                <Area type="monotone" dataKey="saldo_akhir" stroke={COLOR_BALANCE} strokeWidth={2} fill="url(#saldoFill)" dot={{ r: 3, fill: COLOR_BALANCE }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/** Daftar batang horizontal sederhana (label, batang proporsional, nilai). */
function HorizontalBars({ items, color, valueOf, renderValue, empty }) {
  if (!items.length) return <EmptyChart>{empty}</EmptyChart>;
  const max = Math.max(...items.map(valueOf), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-neutral-700">{item.label}</span>
            <span className="shrink-0 tabular-nums text-neutral-900">{renderValue(item)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max((valueOf(item) / max) * 100, 2)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Grafik halaman Keuangan (FR-FIN-06 & FR-FIN-08). `charts` dari /api/finance/report. */
export default function FinanceCharts({ charts, tab, loading }) {
  const expenses = charts?.expense_by_category ?? [];
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const products = charts?.top_products ?? [];

  return (
    <div className={cn("transition-opacity", loading && "opacity-60")} aria-busy={loading}>
      <CashflowChart rows={charts?.cashflow ?? []} tab={tab} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Pengeluaran per jenis</h2>
            <span className="text-[11px] text-neutral-400">Total {formatRupiah(totalExpense)}</span>
          </div>
          <HorizontalBars
            items={expenses.map((e) => ({ ...e, key: e.category, label: e.category }))}
            color={COLOR_OUT}
            valueOf={(e) => e.amount}
            renderValue={(e) => (
              <>
                {formatRupiah(e.amount)}
                <span className="ml-1.5 text-[11px] text-neutral-400">{Math.round((e.amount / totalExpense) * 100)}%</span>
              </>
            )}
            empty="Belum ada pengeluaran pada periode ini."
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Barang terlaris</h2>
            <span className="text-[11px] text-neutral-400">5 teratas menurut omzet</span>
          </div>
          <HorizontalBars
            items={products.map((p, i) => ({ ...p, key: p.product_id, label: `${i + 1}. ${p.name}` }))}
            color={COLOR_BALANCE}
            valueOf={(p) => p.omzet}
            renderValue={(p) => (
              <>
                {formatRupiah(p.omzet)}
                <span className="ml-1.5 text-[11px] text-neutral-400">{p.qty.toLocaleString("id-ID")} terjual</span>
              </>
            )}
            empty="Belum ada barang terjual pada periode ini."
          />
        </Card>
      </div>
    </div>
  );
}
