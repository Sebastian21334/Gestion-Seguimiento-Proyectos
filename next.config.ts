import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Mantener la resolución nativa de las dependencias opcionales de ws.
  // Al empaquetarlas, el cliente de Neon puede fallar con bufferUtil.mask.
  serverExternalPackages: ["@neondatabase/serverless", "ws"],
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
