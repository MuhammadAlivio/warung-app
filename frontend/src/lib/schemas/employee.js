import { z } from "zod";

const name = z.string().trim().min(2, "Nama minimal 2 karakter").max(255, "Maksimal 255 karakter");
const email = z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid");
const password = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf")
  .regex(/\d/, "Password harus mengandung angka");

export const employeeCreateSchema = z
  .object({ name, email, password, role: z.enum(["kasir", "admin"]) })
  .refine((v) => v.role !== "admin" || v.password.length >= 12, {
    path: ["password"],
    message: "Password administrator minimal 12 karakter",
  });

// Edit: password boleh kosong (tidak diganti)
export const employeeEditSchema = z
  .object({
    name,
    email,
    role: z.enum(["kasir", "admin"]),
    password: z.union([z.literal(""), password]),
    is_active: z.boolean(),
  })
  .refine((v) => v.role !== "admin" || v.password === "" || v.password.length >= 12, {
    path: ["password"],
    message: "Password administrator minimal 12 karakter",
  });
