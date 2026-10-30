import { beforeEach, describe, expect, it, vi } from "vitest";
const { beginSend, pollUntilDone } = vi.hoisted(() => ({
  beginSend: vi.fn(),
  pollUntilDone: vi.fn(),
}));
vi.mock("@azure/communication-email", () => ({
  EmailClient: class {
    beginSend = beginSend;
  },
}));
import { sendEmail } from "@/shared/mail";
import { EmailDeliveryError } from "@/shared/errors";

describe("integración única con ACS", () => {
  beforeEach(() => {
    beginSend.mockResolvedValue({
      getOperationState: () => ({}),
      getResult: () => undefined,
      pollUntilDone,
    });
  });
  it("solicita envío con HTML y texto, conserva el enlace y no espera entrega", async () => {
    await sendEmail({
      to: "a@example.test",
      subject: "Hola",
      html: '<p>Verificá tu correo &amp; continuá.</p><a href="https://example.test/?token=test&amp;x=1">Verificar</a>',
    });
    expect(beginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        senderAddress: "sender@example.test",
        recipients: { to: [{ address: "a@example.test" }] },
        content: expect.objectContaining({
          plainText: expect.stringContaining(
            "Verificar (https://example.test/?token=test&x=1)",
          ),
        }),
      }),
      expect.any(Object),
    );
    expect(pollUntilDone).not.toHaveBeenCalled();
  });
  it("traduce rechazos en un error de dominio sin filtrar credenciales", async () => {
    beginSend.mockRejectedValueOnce(new Error("secret-provider-detail"));
    await expect(
      sendEmail({ to: "a@example.test", subject: "x", html: "x" }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    beginSend.mockResolvedValueOnce({
      getOperationState: () => ({ error: new Error("rejected") }),
      getResult: () => undefined,
    });
    await expect(
      sendEmail({ to: "a@example.test", subject: "x", html: "x" }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
  });
});
