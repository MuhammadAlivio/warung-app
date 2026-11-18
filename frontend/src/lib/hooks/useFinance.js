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

/**
 * Daftar buku kas pada rentang tanggal.
 * `search` = nama / no. HP pelanggan, `q` = kata kunci keterangan (keduanya ditunda 300 ms saat mengetik),
 * `category` = jenis, `page`/`perPage` = dibagi per halaman. meta.total_amount = total seluruh hasil filter.
 */
export function useFinanceEntries({ start, end, type, search, category, q, page, perPage }, refreshKey) {
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_amount: 0, page: 1, page_count: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ start, end });
    if (type) params.set("type", type);
    if (search?.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (q?.trim()) params.set("q", q.trim());
    if (page) params.set("page", page);
    if (perPage) params.set("per_page", perPage);

    setLoading(true);
    const timer = setTimeout(() => {
      api(`/api/finance/entries?${params}`)
        .then((res) => { if (!cancelled) { setEntries(res.data); setMeta(res.meta); setError(""); } })
        .catch((e) => !cancelled && setError(e.message || "Gagal memuat data kas."))
        .finally(() => !cancelled && setLoading(false));
    }, search || q ? 300 : 0);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [start, end, type, search, category, q, page, perPage, refreshKey]);

  return { entries, meta, loading, error };
}

/** Ubah catatan kas manual (entry_id dari baris buku kas). */
export async function updateFinanceEntry(entryId, { type, category, amount, date, method, description }) {
  const res = await api(`/api/finance/entries/${entryId}`, {
    method: "PUT",
    body: { type, category, amount, date, method, description: description || null },
  });
  return res.data;
}

/** Hapus catatan kas manual (hapus lunak, alasan wajib). */
export async function deleteFinanceEntry(entryId, reason) {
  await api(`/api/finance/entries/${entryId}`, { method: "DELETE", body: { reason } });
}

/** Unduh laporan PDF / Excel (format "pdf" | "xlsx") lalu simpan sebagai file. */
export async function downloadFinanceReport({ start, end, format }) {
  const params = new URLSearchParams({ start, end, format });
  let res;
  try {
    res = await fetch(`/api/finance/export?${params}`, { credentials: "include", headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Coba lagi.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const firstFieldError = data?.errors && Object.values(data.errors)[0]?.[0];
    throw new Error(firstFieldError || data?.message || "Laporan gagal dibuat. Coba lagi.");
  }

  const blob = await res.blob();
  const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `laporan-keuangan.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Catat kas masuk / keluar manual. Error validasi dilempar ke pemanggil (ApiError). */
export async function createFinanceEntry({ type, category, amount, date, method, description }) {
  const res = await api("/api/finance/entries", {
    method: "POST",
    body: { type, category, amount, date, method, description: description || null },
  });
  return res.data;
}
