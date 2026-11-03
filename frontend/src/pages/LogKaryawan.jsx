import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Card, Pagination, Select } from "../lib/components/ui";
import AdminShell from "../lib/components/layout/AdminShell";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/utils/dateTime";

const PAGE_SIZE = 15;

const MODULE_OPTIONS = [
  { value: "", label: "Semua modul" },
  { value: "auth", label: "Login / Logout" },
  { value: "pelanggan", label: "Pelanggan" },
  { value: "karyawan", label: "Karyawan" },
];

const MODULE_LABEL = { auth: "Login / Logout", pelanggan: "Pelanggan", karyawan: "Karyawan" };

const ACTION_VARIANT = { login: "success", logout: "neutral", tambah: "brand", ubah: "warning", hapus: "danger" };

const inputClass =
  "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

function LogKaryawanContent() {
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ user_id: "", module: "", q: "", from: "", to: "" });
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/api/employees")
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, []);

  // Pencarian teks menunggu pengguna berhenti mengetik
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 350);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    const params = new URLSearchParams({ page });
    const active = { user_id: filters.user_id, module: filters.module, q: debouncedQ, from: filters.from, to: filters.to };
    Object.entries(active).forEach(([k, v]) => v && params.set(k, v));

    setLoading(true);
    setError(null);
    api(`/api/activity-logs?${params}`)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, filters.user_id, filters.module, filters.from, filters.to, debouncedQ]);

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const employeeOptions = [
    { value: "", label: "Semua karyawan" },
    ...employees.map((e) => ({ value: String(e.id), label: e.name })),
  ];

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Log Karyawan</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Catatan semua aktivitas karyawan di aplikasi: login, logout, dan setiap perubahan data. Terbaru di atas.
        </p>
      </header>

      <Card className="p-5">
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Select aria-label="Filter karyawan" options={employeeOptions} value={filters.user_id} onChange={setFilter("user_id")} />
          <Select aria-label="Filter modul" options={MODULE_OPTIONS} value={filters.module} onChange={setFilter("module")} />
          <input type="date" aria-label="Dari tanggal" value={filters.from} onChange={setFilter("from")} className={inputClass} />
          <input type="date" aria-label="Sampai tanggal" value={filters.to} onChange={setFilter("to")} className={inputClass} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
            <input
              value={filters.q}
              onChange={setFilter("q")}
              placeholder="Cari keterangan..."
              aria-label="Cari keterangan"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-neutral-100">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-100 text-[11px] uppercase text-neutral-500">
              <tr>
                {["Waktu", "Karyawan", "Modul", "Aksi", "Keterangan"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-neutral-500">
                    Memuat data…
                  </td>
                </tr>
              )}
              {!loading && result.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-neutral-500">
                    Belum ada aktivitas yang cocok dengan filter.
                  </td>
                </tr>
              )}
              {!loading &&
                result.data.map((l) => (
                  <tr key={l.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-neutral-600">{formatDateTime(l.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold">{l.user_name}</p>
                      <p className="text-[11px] text-neutral-500">{l.user_role === "admin" ? "Administrator" : "Kasir"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-neutral-600">{MODULE_LABEL[l.module] ?? l.module}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={ACTION_VARIANT[l.action] ?? "neutral"}>{l.action}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-neutral-700">{l.description}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination
          className="mt-4"
          page={page}
          pageCount={result.last_page}
          total={result.total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          itemLabel="aktivitas"
        />
      </Card>
    </div>
  );
}

export default function LogKaryawan() {
  return (
    <AdminShell breadcrumb="Log Karyawan">
      <LogKaryawanContent />
    </AdminShell>
  );
}
