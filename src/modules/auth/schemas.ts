import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresá un correo válido.").max(254));
export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(72, "La contraseña admite hasta 72 caracteres.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "La contraseña no puede superar los 72 bytes.",
  );
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .max(72)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Contraseña demasiado larga.",
    ),
});
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Ingresá tu nombre.").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string({ error: "Repetí la contraseña." })
      .min(1, "Repetí la contraseña.")
      .max(72, "La contraseña admite hasta 72 caracteres."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })
  .transform(({ confirmPassword: _confirmation, ...data }) => data);
export const emailInputSchema = z.object({ email: emailSchema });
export const tokenSchema = z
  .string()
  .min(1, "El enlace no es válido.")
  .max(2048, "El enlace no es válido.");
export const resetSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});
