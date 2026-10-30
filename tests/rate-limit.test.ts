import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ reserve: vi.fn(), release: vi.fn() }));
vi.mock("@/shared/rate-limit/repository", () => mock);
import { reserveAuthAttempt, releaseAuthAttempt } from "@/shared/rate-limit";

describe("políticas de rate limit", () => {
  beforeEach(() => mock.reserve.mockResolvedValue([{ id: "attempt" }]));
  it("login limita 5 por email y 20 por IP durante 15 minutos", async () => {
    await expect(
      reserveAuthAttempt("login", "a@example.test", "127.0.0.1"),
    ).resolves.toEqual(["attempt"]);
    expect(mock.reserve).toHaveBeenCalledWith([
      expect.objectContaining({
        key: expect.stringMatching(/^login:email:[a-f0-9]{64}$/),
        limit: 5,
        windowMs: 900000,
      }),
      expect.objectContaining({
        key: expect.stringMatching(/^login:ip:/),
        limit: 20,
        windowMs: 900000,
      }),
    ]);
    expect(JSON.stringify(mock.reserve.mock.calls)).not.toContain(
      "a@example.test",
    );
  });
  it.each(["register", "resend", "forgot"] as const)(
    "%s tiene su propio límite 3/10 durante una hora",
    async (operation) => {
      await reserveAuthAttempt(operation, "a@example.test", "ip");
      expect(mock.reserve).toHaveBeenCalledWith([
        expect.objectContaining({
          key: expect.stringMatching(new RegExp(`^${operation}:email:`)),
          limit: 3,
          windowMs: 3600000,
        }),
        expect.objectContaining({ limit: 10, windowMs: 3600000 }),
      ]);
    },
  );
  it("un bucket agotado bloquea la operación y libera solo intentos propios exitosos", async () => {
    mock.reserve.mockResolvedValue(null);
    await expect(
      reserveAuthAttempt("login", "a@example.test", "ip"),
    ).rejects.toMatchObject({ status: 429 });
    await releaseAuthAttempt(["attempt"]);
    expect(mock.release).toHaveBeenCalledWith(["attempt"]);
  });
});
