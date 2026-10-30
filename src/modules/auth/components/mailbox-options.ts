// Opciones de presentación usadas por la pantalla posterior al registro.
export const mailboxes = [
  { id: "gmail", label: "Gmail", url: "https://mail.google.com/" },
  { id: "outlook", label: "Outlook", url: "https://outlook.live.com/mail/" },
  { id: "yahoo", label: "Yahoo Mail", url: "https://mail.yahoo.com/" },
  { id: "icloud", label: "iCloud Mail", url: "https://www.icloud.com/mail/" },
  { id: "proton", label: "Proton Mail", url: "https://mail.proton.me/" },
] as const;

export type MailboxProvider = (typeof mailboxes)[number]["id"] | "other";

export function mailboxProviderForEmail(email: string): MailboxProvider {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (["gmail.com", "googlemail.com"].includes(domain)) return "gmail";
  if (
    [
      "outlook.com",
      "hotmail.com",
      "live.com",
      "msn.com",
      "hotmail.es",
      "hotmail.com.ar",
      "live.com.ar",
    ].includes(domain)
  )
    return "outlook";
  if (["yahoo.com", "yahoo.com.ar", "yahoo.es"].includes(domain))
    return "yahoo";
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return "icloud";
  if (["proton.me", "protonmail.com", "pm.me"].includes(domain))
    return "proton";
  return "other";
}
