import { describe, expect, it } from "vitest";
import { envSchema } from "@/shared/config/env-schema";
import { registerSchema } from "@/modules/auth/schemas";
import { documentInputSchema } from "@/modules/documents/schemas";

describe("validación de fronteras", () => {
  it("normaliza email y limita bytes de bcrypt", () => {
    expect(
      registerSchema.parse({
        email: " A@Example.Test ",
        name: " Ana ",
        password: "0123456789",
        confirmPassword: "0123456789",
      }),
    ).toMatchObject({ email: "a@example.test", name: "Ana" });
    expect(
      registerSchema.safeParse({
        email: "a@example.test",
        name: "A",
        password: "🔐".repeat(20),
        confirmPassword: "🔐".repeat(20),
      }).success,
    ).toBe(false);
  });
  it("exige repetir la contraseña y rechaza diferencias sin normalizarla", () => {
    const base = {
      name: "Ana",
      email: "a@example.test",
      password: "initial-password",
    };
    for (const confirmPassword of [
      undefined,
      "",
      "different-password",
      "initial-password ",
    ]) {
      const result = registerSchema.safeParse({ ...base, confirmPassword });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          result.error.issues.some((issue) =>
            issue.path.includes("confirmPassword"),
          ),
        ).toBe(true);
    }
    expect(
      registerSchema.parse({ ...base, confirmPassword: base.password }),
    ).toEqual(base);
  });
  it("solo acepta enlaces HTTP(S), con largo limitado", () => {
    const base = {
      teamId: "00000000-0000-4000-8000-000000000001",
      title: "Plan",
      type: "gantt",
    };
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///etc/passwd",
      "ftp://example.test/a",
    ])
      expect(documentInputSchema.safeParse({ ...base, url }).success).toBe(
        false,
      );
    for (const url of ["http://example.test", "https://example.test/path"])
      expect(documentInputSchema.safeParse({ ...base, url }).success).toBe(
        true,
      );
  });
  it("requiere ACS, valida ambos secretos y dominios", () => {
    const base = { ...process.env };
    expect(envSchema.safeParse(base).success).toBe(true);
    for (const changes of [
      { ACS_CONNECTION_STRING: "invalid" },
      { ACS_SENDER_ADDRESS: "invalid" },
      { EMAIL_TOKEN_SECRET: base.SESSION_SECRET },
      { SESSION_SECRET: "short" },
      { ALLOWED_EMAIL_DOMAINS: "gmail.com;invalid domain" },
      { NODE_ENV: "production", APP_URL: "http://example.test" },
    ])
      expect(envSchema.safeParse({ ...base, ...changes }).success).toBe(false);
    expect(
      envSchema.parse({
        ...base,
        ALLOWED_EMAIL_DOMAINS: "GMAIL.COM; ejemplo.com",
      }).ALLOWED_EMAIL_DOMAINS,
    ).toEqual(["gmail.com", "ejemplo.com"]);
  });
});
