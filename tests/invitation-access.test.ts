import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  preview: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));
vi.mock("@/shared/session", () => ({ getCurrentUser: mocks.user, requireCurrentUser: vi.fn() }));
vi.mock("@/modules/invitations/service", () => ({ invitationPreview: mocks.preview }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, unstable_rethrow: () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { invitationPageAction } from "@/modules/invitations/actions";

describe("acceso al enlace de invitación", () => {
  beforeEach(() => { mocks.user.mockResolvedValue(null); });
  it("redirige sin sesión al acceso con aviso sin pasar el token ni consultar la invitación", async () => {
    await expect(invitationPageAction("a".repeat(64))).rejects.toThrow("REDIRECT:/login?invitacion=1");
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login?invitacion=1");
  });
  it("permite consultar la invitación cuando el usuario vuelve a abrir el enlace con sesión", async () => {
    const user = { id: "00000000-0000-4000-8000-000000000001", email: "ana@example.test" };
    mocks.user.mockResolvedValue(user);
    mocks.preview.mockResolvedValue({ id: "invitation-id" });
    await expect(invitationPageAction("a".repeat(64))).resolves.toMatchObject({ success: true, invitation: { id: "invitation-id" } });
    expect(mocks.preview).toHaveBeenCalledWith("a".repeat(64), user);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("mantiene la validación del enlace para usuarios autenticados", async () => {
    mocks.user.mockResolvedValue({ id: "user-id" });
    await expect(invitationPageAction("invalid")).resolves.toMatchObject({ success: false });
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});
