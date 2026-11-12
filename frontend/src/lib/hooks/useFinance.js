import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

// Data halaman Keuangan dari backend (/api/finance/*, khusus admin).

/** Laporan satu periode: summary, breakdown (rincian), operational_costs. */
export function useFinanceReport(period, date) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api(`/api/finance/report?period=${period}&date=${date}`)
      .then((res) => !cancelled && setReport(res.data))
      .catch((e) => !cancelled && setError(e.message || "Gagal memuat laporan keuangan."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [period, date, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { report, loading, error, reload };
}

/** Daftar buku kas pada rentang tanggal. `search` = nama / no. HP pelanggan (ditunda 300 ms saat mengetik). */
export function useFinanceEntries({ start, end, type, search }, refreshKey) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ start, end });
    if (type) params.set("type", type);
    if (search?.trim()) params.set("search", search.trim());

    setLoading(true);
    const timer = setTimeout(() => {
      api(`/api/finance/entries?${params}`)
        .then((res) => { if (!cancelled) { setEntries(res.data); setError(""); } })
        .catch((e) => !cancelled && setError(e.message || "Gagal memuat data pemasukan."))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [start, end, type, search, refreshKey]);

  return { entries, loading, error };
}

/** Catat kas masuk / keluar manual. Error validasi dilempar ke pemanggil (ApiError). */
export async function createFinanceEntry({ type, category, amount, date, method, description }) {
  const res = await api("/api/finance/entries", {
    method: "POST",
    body: { type, category, amount, date, method, description: description || null },
  });
  return res.data;
}
