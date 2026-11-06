import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Conservar la resolución nativa del cliente de Neon y las fuentes de PDFKit.
  serverExternalPackages: ["@neondatabase/serverless", "ws", "pdfkit"],
  outputFileTracingIncludes: {
    "/t/*/gantt/exportar/*": [
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      ...["/verificar", "/restablecer", "/invitaciones/:path*"].map(
        (source) => ({
          source,
          headers: [
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "Cache-Control", value: "no-store" },
          ],
        }),
      ),
    ];
  },
};
export default config;
