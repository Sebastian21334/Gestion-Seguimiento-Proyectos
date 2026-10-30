import "server-only";
import { escapeHtml } from "./html";

export function brandedEmail({
  name,
  eyebrow,
  title,
  paragraphs,
  actionLabel,
  actionUrl,
  note,
}: {
  name: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  note: string;
}) {
  const url = escapeHtml(actionUrl);
  return `<!doctype html>
<html lang="es-AR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f6f7fb;color:#152138;font-family:Segoe UI,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f7fb;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e7eaf0;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background-color:#101f33;border-bottom:4px solid #168b75;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="width:38px;height:38px;text-align:center;background-color:#163d3f;border:1px solid #28665d;border-radius:10px;color:#42e5b3;font-size:18px;font-weight:700;">&lt;/&gt;</td>
            <td style="padding-left:12px;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-1px;">equipo<span style="color:#42e5b3;">.</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:34px 32px 28px;">
          <p style="margin:0 0 14px;color:#168b75;font-size:10px;font-weight:700;letter-spacing:2px;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0 0 24px;color:#152138;font-size:28px;line-height:1.25;font-weight:700;letter-spacing:-0.8px;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 14px;color:#405068;font-size:15px;line-height:1.8;">Hola, <strong>${escapeHtml(name)}</strong>.</p>
          ${paragraphs.map((paragraph) => `<p style="margin:0 0 16px;color:#68748a;font-size:14px;line-height:1.8;">${escapeHtml(paragraph)}</p>`).join("\n")}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;"><tr><td bgcolor="#168b75" style="background-color:#168b75;border-radius:8px;text-align:center;">
            <a href="${url}" style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.4;">${escapeHtml(actionLabel)} →</a>
          </td></tr></table>
          <p style="margin:0;padding:14px 16px;background-color:#eef9f3;border:1px solid #d4eddf;border-radius:8px;color:#257656;font-size:12px;line-height:1.8;">${escapeHtml(note)}</p>
          <p style="margin:24px 0 8px;color:#8b96a6;font-size:11px;line-height:1.8;">Si el botón no funciona, copiá este enlace en tu navegador:</p>
          <p style="margin:0;font-size:11px;line-height:1.8;word-break:break-all;"><a href="${url}" style="color:#168b75;text-decoration:underline;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #e7eaf0;background-color:#fafbfd;">
          <p style="margin:0 0 5px;color:#536176;font-size:12px;font-weight:600;">Tu equipo, en la misma sintonía.</p>
          <p style="margin:0;color:#8b96a6;font-size:11px;line-height:1.8;">Si no solicitaste este correo, podés ignorarlo.</p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#929cad;font-size:10px;letter-spacing:0.3px;">Hecho para trabajar mejor, juntos.</p>
    </td></tr>
  </table>
</body>
</html>`;
}
