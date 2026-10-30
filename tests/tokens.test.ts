import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import * as tokens from "@/modules/auth/tokens";

const id = "00000000-0000-4000-8000-000000000001";
describe("separación y vencimiento de tokens", () => {
  it("cada token funciona únicamente para su propósito", async () => {
    const session = await tokens.createSessionToken(id, 3);
    const verify = await tokens.createVerificationToken(id, "a@example.test");
    const reset = await tokens.createResetToken(id, "old-password-hash");
    await expect(tokens.readSessionToken(session)).resolves.toMatchObject({
      sub: id,
      tv: 3,
    });
    await expect(tokens.readVerificationToken(verify)).resolves.toMatchObject({
      sub: id,
      email: "a@example.test",
    });
    await expect(tokens.readResetToken(reset)).resolves.toMatchObject({
      pw: tokens.passwordFingerprint("old-password-hash"),
    });
    for (const token of [verify, reset])
      await expect(tokens.readSessionToken(token)).rejects.toThrow();
    for (const token of [session, reset])
      await expect(tokens.readVerificationToken(token)).rejects.toThrow();
    for (const token of [session, verify])
      await expect(tokens.readResetToken(token)).rejects.toThrow();
  });
  it("rechaza tokens vencidos, sin exp y con otro algoritmo", async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const base = () =>
      new SignJWT({ purpose: "session", tv: 0 })
        .setSubject(id)
        .setIssuedAt()
        .setIssuer("https://equipo.test")
        .setAudience("team-board");
    for (const token of [
      await base()
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("-1s")
        .sign(secret),
      await base().setProtectedHeader({ alg: "HS256" }).sign(secret),
      await base()
        .setProtectedHeader({ alg: "HS384" })
        .setExpirationTime("1h")
        .sign(secret),
    ])
      await expect(tokens.readSessionToken(token)).rejects.toThrow();
  });
  it("vincula el reset al hash actual", () => {
    expect(tokens.passwordFingerprint("old")).not.toBe(
      tokens.passwordFingerprint("new"),
    );
  });
});
