import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Input, Modal, ModalBody, ModalFooter, PasswordInput, Select } from "../ui";
import { employeeCreateSchema, employeeEditSchema } from "../../schemas/employee";

const empty = { name: "", email: "", password: "", role: "kasir", is_active: true };

const ROLE_OPTIONS = [
  { value: "kasir", label: "Kasir (karyawan)" },
  { value: "admin", label: "Administrator" },
];

/** Tambah (employee kosong) & Edit (employee terisi). Akun baru selalu berperan kasir. */
export default function EmployeeFormModal({ open, onClose, onSubmit, employee, isSelf = false }) {
  const editing = !!employee;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editing ? employeeEditSchema : employeeCreateSchema),
    defaultValues: empty,
  });

  const role = watch("role");

  useEffect(() => {
    if (open) reset(employee ? { name: employee.name, email: employee.email, password: "", role: employee.role, is_active: employee.is_active } : empty);
  }, [open, employee, reset]);

  const submit = async (values) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      // Pesan validasi dari server (mis. email sudah dipakai) ditampilkan di bawah kolomnya
      const fields = err.data?.errors;
      if (fields) {
        Object.entries(fields).forEach(([field, msgs]) => setError(field, { message: msgs[0] }));
      } else {
        setError("root", { message: err.message });
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit karyawan" : "Tambah karyawan"}
      description={editing ? "Ubah data akun karyawan atau reset password-nya." : "Buat akun baru untuk karyawan atau administrator toko."}
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <Input label="Nama lengkap" placeholder="Nama karyawan" error={errors.name?.message} {...register("name")} />
          <Input
            label="Email (untuk login)"
            type="email"
            autoComplete="off"
            placeholder="nama@email.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Select
            label="Peran"
            // Akun sendiri: peran tidak bisa diubah, jadi hanya pilihan peran saat ini
            options={isSelf ? ROLE_OPTIONS.filter((o) => o.value === employee.role) : ROLE_OPTIONS}
            error={errors.role?.message}
            {...register("role")}
          />
          {isSelf && (
            <p className="-mt-2 text-[11px] text-neutral-500">
              Anda tidak bisa mengubah peran atau menonaktifkan akun sendiri.
            </p>
          )}
          <PasswordInput
            label={editing ? "Password baru (opsional)" : "Password awal"}
            autoComplete="new-password"
            placeholder={editing ? "Kosongkan jika tidak diganti" : role === "admin" ? "Minimal 12 karakter, huruf dan angka" : "Minimal 8 karakter, huruf dan angka"}
            error={errors.password?.message}
            {...register("password")}
          />
          {editing && !isSelf && (
            <Checkbox
              label="Akun aktif (karyawan boleh login)"
              error={errors.is_active?.message}
              {...register("is_active")}
            />
          )}
          {role === "admin" && (employee?.role !== "admin" || !editing) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
              Administrator punya akses penuh (keuangan, stok, akun karyawan) dan wajib setup 2FA saat login pertama lewat
              halaman login admin.
            </p>
          )}
          {editing && employee?.role === "admin" && role === "kasir" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
              Diturunkan menjadi kasir: akses keuangan dan pengaturan dicabut, dan 2FA akun ini dihapus.
            </p>
          )}
          {editing && (
            <p className="text-[11px] text-neutral-500">
              Mengisi password baru juga membuka kunci akun yang terkunci karena terlalu banyak percobaan login.
            </p>
          )}
          {errors.root && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {errors.root.message}
            </p>
          )}
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button type="button" variant="outline" fullWidth={false} onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" fullWidth={false} loading={isSubmitting}>
            {editing ? "Simpan perubahan" : "Tambah karyawan"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
