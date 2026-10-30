import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/modules/auth/service", () => ({
  registerUser: mocks.register,
  GENERIC_MAIL_MESSAGE: "Si el mail es válido, te enviamos un correo",
}));
vi.mock("@/modules/auth/request", () => ({ clientIp: async () => "test-ip" }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: () => {},
}));
import { registerAction } from "@/modules/auth/actions";

const previous = { success: false, message: "" };
function registrationForm(
  email = " Ana@Gmail.com ",
  confirmation = "initial-password",
) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: " Ana ",
    email,
    password: "initial-password",
    confirmPassword: confirmation,
  }))
    form.set(key, value);
  return form;
}

describe("salida del registro", () => {
  beforeEach(() => {
    mocks.register.mockReset().mockResolvedValue(undefined);
  });
  it("navega a una pantalla nueva después del registro sin incluir datos personales en la URL", async () => {
    await expect(registerAction(previous, registrationForm())).rejects.toThrow(
      "REDIRECT:/registro/correo?proveedor=gmail",
    );
    expect(mocks.register).toHaveBeenCalledWith(
      { name: "Ana", email: "ana@gmail.com", password: "initial-password" },
      "test-ip",
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/registro/correo?proveedor=gmail",
    );
  });
  it("también muestra la pantalla para proveedores no reconocidos", async () => {
    await expect(
      registerAction(previous, registrationForm("a@empresa.test")),
    ).rejects.toThrow("REDIRECT:/registro/correo?proveedor=other");
  });
  it("mantiene el formulario si las contraseñas no coinciden y no intenta registrar", async () => {
    await expect(
      registerAction(
        previous,
        registrationForm("a@gmail.com", "different-password"),
      ),
    ).resolves.toMatchObject({
      success: false,
      message: "Las contraseñas no coinciden.",
    });
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("un límite agotado muestra el error y no navega a la pantalla de correo", async () => {
    const { RateLimitError } = await import("@/shared/errors");
    mocks.register.mockRejectedValueOnce(new RateLimitError());
    await expect(
      registerAction(previous, registrationForm()),
    ).resolves.toMatchObject({
      success: false,
      message: expect.stringContaining("Demasiados intentos"),
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
