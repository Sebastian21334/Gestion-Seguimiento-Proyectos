import "server-only";
import { headers } from "next/headers";
import { isIP } from "node:net";
import { env } from "@/shared/config/env";

export async function clientIp() {
  if (!env.TRUST_PROXY) return "untrusted-proxy";
  const value = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  return value && isIP(value) ? value : "unknown";
}
