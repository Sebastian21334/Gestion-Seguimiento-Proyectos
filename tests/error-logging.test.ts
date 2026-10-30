import { afterEach, expect, it, vi } from "vitest";
import { logUnexpectedError } from "@/shared/errors/log";

afterEach(() => vi.restoreAllMocks());

it("registra causas conocidas sin filtrar SQL, contraseñas, correos ni tokens", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const cause = Object.assign(new Error("secret-token password@example.test"), {
    code: "ENOTFOUND",
    query: "select secret",
    parameters: ["private-password"],
  });
  logUnexpectedError(
    new Error("postgresql://private:password@host/database", { cause }),
  );
  const output = JSON.stringify(log.mock.calls);
  expect(output).toContain("ENOTFOUND");
  for (const secret of [
    "secret-token",
    "password@example.test",
    "select secret",
    "private-password",
    "postgresql://",
  ])
    expect(output).not.toContain(secret);
});

it("rechaza códigos y nombres no reconocidos y limita causas circulares", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const error: { name: string; code: string; cause?: unknown } = {
    name: "secret-name",
    code: "secret-code",
  };
  error.cause = error;
  logUnexpectedError(error);
  expect(log).toHaveBeenCalledWith(expect.any(String), {
    causes: [{ type: "UnknownError" }],
  });
});
