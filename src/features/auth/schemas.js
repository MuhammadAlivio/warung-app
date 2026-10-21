import { z } from "zod";

const email = z
  .string()
  .min(1, "Email wajib diisi")
  .email("Format email tidak valid");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi"),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi"),
});

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Masukkan 6 digit kode autentikasi"),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
    email,
    password: z
      .string()
      .min(12, "Password minimal 12 karakter")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf")
      .regex(/\d/, "Password harus mengandung angka"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    terms: z.boolean().refine((v) => v === true, {
      message: "Anda harus menyetujui Syarat & Ketentuan",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok",
  });
