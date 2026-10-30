import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "bcryptjs";
import type { User } from "@/modules/users";

const state = vi.hoisted(() => ({
  user: null as User | null,
  cookie: "",
  sends: vi.fn(),
  inserts: vi.fn(),
  attempts: vi.fn(),
  cookies: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.cookie ? { value: state.cookie } : undefined),
    set: (_key: string, value: string, options: unknown) => {
      state.cookie = value;
      state.cookies(options);
    },
    delete: () => {
      state.cookie = "";
    },
  }),
}));
vi.mock("@/modules/users", () => ({
  findUserById: async (id: string) =>
    state.user?.id === id ? { ...state.user } : undefined,
  findUserByEmail: async (email: string) =>
    state.user?.email === email ? { ...state.user } : undefined,
  publicCurrentUser: (user: User) => {
    const { passwordHash: _hash, tokenVersion: _tv, ...publicUser } = user;
    return publicUser;
  },
  createUser: (data: unknown) => state.inserts(data),
  verifyUserEmail: async (id: string, email: string) => {
    if (state.user?.id !== id || state.user.email !== email) return undefined;
    state.user.emailVerifiedAt ??= new Date();
    return { id };
  },
  replaceUserPassword: async (id: string, previous: string, next: string) => {
    if (state.user?.id !== id || state.user.passwordHash !== previous)
      return undefined;
    state.user.passwordHash = next;
    state.user.tokenVersion++;
    return { id };
  },
}));
vi.mock("@/shared/mail", () => ({
  sendEmail: (...args: unknown[]) => state.sends(...args),
  escapeHtml: (s: string) => s,
}));
vi.mock("@/shared/rate-limit", () => ({
  reserveAuthAttempt: (...args: unknown[]) => state.attempts(...args),
  releaseAuthAttempt: vi.fn(),
}));
import * as auth from "@/modules/auth/service";
import * as tokens from "@/modules/auth/tokens";

describe("reglas de autenticación", () => {
  beforeEach(async () => {
    state.cookie = "";
    state.attempts.mockResolvedValue([]);
    state.sends.mockResolvedValue(undefined);
    state.inserts.mockResolvedValue(undefined);
    state.user = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Ana",
      email: "ana@example.test",
      passwordHash: await hash("initial-password", 4),
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
      bio: null,
      githubUsername: null,
      createdAt: new Date(),
    };
  });
  it("impide login sin verificación con el mismo mensaje que credenciales erróneas", async () => {
    state.user!.emailVerifiedAt = null;
    await expect(
      auth.login(
        { email: state.user!.email, password: "initial-password" },
        "ip",
      ),
    ).rejects.toThrow("Mail o contraseña incorrectos");
    expect(state.cookie).toBe("");
    await expect(
      auth.login(
        { email: "unknown@example.test", password: "invalid-password" },
        "ip",
      ),
    ).rejects.toThrow("Mail o contraseña incorrectos");
  });
  it("crea una cookie segura y revisa token_version en cada lectura", async () => {
    await auth.login(
      { email: state.user!.email, password: "initial-password" },
      "ip",
    );
    expect(state.cookies).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      }),
    );
    await expect(auth.getCurrentUser()).resolves.toMatchObject({
      id: state.user!.id,
    });
    state.user!.tokenVersion++;
    await expect(auth.getCurrentUser()).resolves.toBeNull();
    state.user = null;
    await expect(auth.getCurrentUser()).resolves.toBeNull();
  });
  it("el reset se usa una sola vez e invalida sesiones anteriores", async () => {
    const oldSession = await tokens.createSessionToken(state.user!.id, 0);
    const reset = await tokens.createResetToken(
      state.user!.id,
      state.user!.passwordHash,
    );
    await auth.resetPassword(reset, "a-new-password");
    expect(state.user!.tokenVersion).toBe(1);
    await expect(auth.resetPassword(reset, "another-password")).rejects.toThrow(
      "ya fue utilizado",
    );
    state.cookie = oldSession;
    await expect(auth.getCurrentUser()).resolves.toBeNull();
  });
  it("dos restablecimientos simultáneos no pueden consumir el mismo hash", async () => {
    const reset = await tokens.createResetToken(
      state.user!.id,
      state.user!.passwordHash,
    );
    const results = await Promise.allSettled([
      auth.resetPassword(reset, "password-one"),
      auth.resetPassword(reset, "password-two"),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(state.user!.tokenVersion).toBe(1);
  });
  it("verificar un correo es idempotente", async () => {
    state.user!.emailVerifiedAt = null;
    const token = await tokens.createVerificationToken(
      state.user!.id,
      state.user!.email,
    );
    await auth.verifyEmail(token);
    const timestamp = state.user!.emailVerifiedAt;
    await auth.verifyEmail(token);
    expect(state.user!.emailVerifiedAt).toBe(timestamp);
  });
  it("olvidé contraseña responde igual exista o no el correo", async () => {
    await expect(
      auth.forgotPassword("unknown@example.test", "ip"),
    ).resolves.toBeUndefined();
    await expect(
      auth.forgotPassword(state.user!.email, "ip"),
    ).resolves.toBeUndefined();
    expect(state.sends).toHaveBeenCalledTimes(1);
    expect(state.attempts).toHaveBeenCalledWith(
      "forgot",
      "unknown@example.test",
      "ip",
    );
  });
  it("registro existente envía recuperación y mantiene respuesta genérica", async () => {
    await expect(
      auth.registerUser(
        {
          email: state.user!.email,
          name: "Otro nombre",
          password: "initial-password",
        },
        "ip",
      ),
    ).resolves.toBeUndefined();
    expect(state.sends).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Ya tenés una cuenta · Equipo" }),
    );
    expect(state.user!.name).toBe("Ana");
  });
  it("el correo de verificación usa el nombre guardado y el enlace correcto", async () => {
    state.user!.emailVerifiedAt = null;
    await auth.registerUser(
      {
        email: state.user!.email,
        name: "Nombre enviado",
        password: "initial-password",
      },
      "ip",
    );
    const email = state.sends.mock.calls[0][0];
    expect(email.subject).toBe("Verificá tu correo · Equipo");
    expect(email.html).toContain("<strong>Ana</strong>");
    expect(email.html).not.toContain("Nombre enviado");
    expect(email.html).toContain("https://equipo.test/verificar?token=");
    expect(email.html).toContain("24 horas");
  });
  it("un rechazo de correo conserva la respuesta genérica de registro", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.sends.mockRejectedValueOnce(new Error("private-provider-error"));
    try {
      await expect(
        auth.registerUser(
          {
            email: state.user!.email,
            name: "Ana",
            password: "initial-password",
          },
          "ip",
        ),
      ).resolves.toBeUndefined();
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "private-provider-error",
      );
    } finally {
      log.mockRestore();
    }
  });
});
