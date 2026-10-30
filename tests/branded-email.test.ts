import { describe, expect, it } from "vitest";
import { brandedEmail } from "@/shared/mail/template";
import { htmlToPlainText } from "@/shared/mail/html";
import {
  mailboxProviderForEmail,
  mailboxes,
} from "@/modules/auth/components/mailbox-options";

describe("correo con identidad de equipo", () => {
  it("personaliza y escapa el contenido; mantiene un enlace de respaldo legible", () => {
    const url = "https://example.test/verificar?token=demo&purpose=verify";
    const html = brandedEmail({
      name: '<img src=x onerror="alert(1)">',
      eyebrow: "VERIFICÁ TU CORREO",
      title: "Un paso más",
      paragraphs: ["Confirmá tu correo <script>alert(1)</script>"],
      actionLabel: "Verificar mi correo",
      actionUrl: url,
      note: "El enlace dura 24 horas.",
    });
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain(
      'href="https://example.test/verificar?token=demo&amp;purpose=verify"',
    );
    const text = htmlToPlainText(html);
    expect(text).toContain(`Verificar mi correo → (${url})`);
    expect(text).toContain("El enlace dura 24 horas.");
    expect(text).not.toMatch(/<table|font-family|viewport|<head/);
  });
  it("la alternativa de texto elimina estilos y scripts del encabezado", () => {
    const text = htmlToPlainText(
      "<html><head><title>Metadata</title><style>.a{color:red}</style></head><body><p>Hola</p><script>secret()</script><p>Continuá</p></body></html>",
    );
    expect(text).toBe("Hola\nContinuá");
  });
});

describe("acceso a la bandeja de entrada", () => {
  it.each([
    ["a@gmail.com", "gmail"],
    [" A@Hotmail.com ", "outlook"],
    ["a@yahoo.com.ar", "yahoo"],
    ["a@icloud.com", "icloud"],
    ["a@proton.me", "proton"],
    ["a@empresa.test", "other"],
    ["a@gmail.com.evil.test", "other"],
  ])("resuelve %s con URLs fijas", (email, expected) => {
    expect(mailboxProviderForEmail(email)).toBe(expected);
  });
  it("solo ofrece URLs HTTPS predefinidas sin correos ni tokens", () => {
    for (const mailbox of mailboxes) {
      const url = new URL(mailbox.url);
      expect(url.protocol).toBe("https:");
      expect(url.search).toBe("");
      expect(url.username).toBe("");
    }
  });
});
