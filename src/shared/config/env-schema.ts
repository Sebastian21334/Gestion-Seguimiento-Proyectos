import { z } from "zod";

const httpUrl = z
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol));
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => /^postgres(ql)?:\/\//.test(value),
        "Se requiere una URL de Postgres",
      ),
    APP_URL: httpUrl.transform((value) => value.replace(/\/$/, "")),
    ACS_CONNECTION_STRING: z
      .string()
      .trim()
      .regex(
        /^endpoint=https:\/\/[^;\s]+;accesskey=[^;\s]+;?$/i,
        "Cadena de conexión de ACS inválida",
      ),
    ACS_SENDER_ADDRESS: z.email().max(254),
    SESSION_SECRET: z.string().min(32),
    EMAIL_TOKEN_SECRET: z.string().min(32),
    ALLOWED_EMAIL_DOMAINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(/[,;]/)
          .map((domain) => domain.trim().toLowerCase())
          .filter(Boolean),
      ),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.SESSION_SECRET === env.EMAIL_TOKEN_SECRET)
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_TOKEN_SECRET"],
        message: "Los secretos deben ser distintos",
      });
    if (env.NODE_ENV === "production" && !env.APP_URL.startsWith("https://"))
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "Producción requiere HTTPS",
      });
    for (const domain of env.ALLOWED_EMAIL_DOMAINS) {
      if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain))
        ctx.addIssue({
          code: "custom",
          path: ["ALLOWED_EMAIL_DOMAINS"],
          message: "Dominio inválido",
        });
    }
  });
