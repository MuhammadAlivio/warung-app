import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { Badge, Button, Card, Modal, ModalBody, ModalFooter } from "../lib/components/ui";
import AdminShell from "../lib/components/layout/AdminShell";
import EmployeeFormModal from "../lib/components/karyawan/EmployeeFormModal";
import { api } from "../lib/api";
import { useAuth } from "../lib/stores/AuthContext";
import { formatDateTime } from "../lib/utils/dateTime";

function DaftarKaryawanContent() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ open: false, employee: undefined });
  const isAdmin = user?.role === "admin"; // kasir hanya melihat daftar
  const [toggling, setToggling] = useState(null); // karyawan yang akan diaktifkan/dinonaktifkan

  const load = useCallback(() => {
    setError(null);
    return api("/api/employees")
      .then((res) => setEmployees(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(t) || (e.email ?? "").toLowerCase().includes(t));
  }, [employees, q]);

  const save = async (values) => {
    if (form.employee) {
      await api(`/api/employees/${form.employee.id}`, {
        method: "PUT",
        body: { name: values.name, email: values.email, is_active: values.is_active, password: values.password || null },
      });
    } else {
      await api("/api/employees", { method: "POST", body: { name: values.name, email: values.email, password: values.password } });
    }
    await load();
  };

  const confirmToggle = async () => {
    const e = toggling;
    try {
      await api(`/api/employees/${e.id}`, {
        method: "PUT",
        body: { name: e.name, email: e.email, is_active: !e.is_active, password: null },
      });
      await load();
    } catch (err) {
      window.alert(err.message);
    }
    setToggling(null);
  };

  const columns = isAdmin ? ["Nama", "Email", "Peran", "Status", "Login terakhir", "Aksi"] : ["Nama", "Peran", "Status"];
  const activeCount = employees.filter((e) => e.role === "kasir" && e.is_active).length;

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Karyawan</h1>
          <p className="mt-1 text-xs text-neutral-500">
            {isAdmin
              ? "Kelola akun karyawan toko. Akun yang dinonaktifkan tidak bisa login, riwayat aktivitasnya tetap tersimpan."
              : "Daftar karyawan toko. Pengelolaan akun hanya bisa dilakukan administrator."}
          </p>
        </div>
        {isAdmin && (
          <Button fullWidth={false} onClick={() => setForm({ open: true, employee: undefined })}>
            <Plus className="h-4 w-4" aria-hidden /> Tambah karyawan
          </Button>
        )}
      </header>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">
            Karyawan <span className="text-xs font-normal text-neutral-500">({activeCount} kasir aktif)</span>
          </h2>
          <div className="relative w-full min-w-[200px] sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAdmin ? "Cari nama atau email..." : "Cari nama..."}
              aria-label="Cari karyawan"
              className="h-11 w-full rounded-lg border border-neutral-200 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-neutral-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-100 text-[11px] uppercase text-neutral-500">
              <tr>
                {columns.map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-neutral-500">
                    Memuat data…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-neutral-500">
                    {q ? "Tidak ada karyawan yang cocok." : "Belum ada karyawan."}
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                const rowIsAdmin = e.role === "admin";
                return (
                  <tr key={e.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3.5 font-semibold">
                      {e.name}
                      {e.id === user?.id && <span className="ml-2 text-[11px] font-normal text-neutral-500">(Anda)</span>}
                    </td>
                    {isAdmin && <td className="px-4 py-3.5 text-xs text-neutral-600">{e.email}</td>}
                    <td className="px-4 py-3.5">
                      <Badge variant={rowIsAdmin ? "info" : "neutral"}>{rowIsAdmin ? "Administrator" : "Kasir"}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={e.is_active ? "brand" : "danger"}>{e.is_active ? "Aktif" : "Nonaktif"}</Badge>
                    </td>
                    {isAdmin && <td className="px-4 py-3.5 text-xs text-neutral-600">{formatDateTime(e.last_login_at)}</td>}
                    {isAdmin && (
                    <td className="px-4 py-3.5">
                      {rowIsAdmin ? (
                        <span className="text-xs text-neutral-400">-</span>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            fullWidth={false}
                            onClick={() => setForm({ open: true, employee: e })}
                            aria-label={`Edit ${e.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={e.is_active ? "danger" : "primary"}
                            fullWidth={false}
                            onClick={() => setToggling(e)}
                          >
                            {e.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      )}
                    </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <EmployeeFormModal
        open={form.open}
        onClose={() => setForm({ open: false, employee: undefined })}
        onSubmit={save}
        employee={form.employee}
      />

      <Modal
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.is_active ? "Nonaktifkan karyawan?" : "Aktifkan karyawan?"}
        description={
          toggling?.is_active
            ? `${toggling?.name} tidak akan bisa login lagi, dan sesi yang sedang aktif langsung berakhir.`
            : `${toggling?.name} akan bisa login kembali.`
        }
      >
        <ModalBody />
        <ModalFooter className="justify-end">
          <Button variant="outline" fullWidth={false} onClick={() => setToggling(null)}>
            Batal
          </Button>
          <Button variant={toggling?.is_active ? "danger" : "primary"} fullWidth={false} onClick={confirmToggle}>
            {toggling?.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default function DaftarKaryawan() {
  return (
    <AdminShell breadcrumb="Daftar Karyawan">
      <DaftarKaryawanContent />
    </AdminShell>
  );
}
