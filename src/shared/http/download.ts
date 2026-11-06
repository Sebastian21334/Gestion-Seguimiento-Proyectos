export const privateResponse = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export function downloadHeaders(type: string, filename: string, fallback: string) {
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return {
    ...privateResponse,
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`,
  };
}
