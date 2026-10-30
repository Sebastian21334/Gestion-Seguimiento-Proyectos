import "server-only";

const knownCodes = new Set([
  "EACCES",
  "EPERM",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "08000",
  "08001",
  "08003",
  "08006",
  "28P01",
  "3D000",
  "42P01",
  "42703",
  "23502",
  "23503",
  "23505",
  "22001",
  "25P02",
  "53300",
  "57P03",
]);
const knownNames = new Set([
  "Error",
  "TypeError",
  "AggregateError",
  "DrizzleQueryError",
  "DatabaseError",
  "ErrorEvent",
  "TimeoutError",
]);

// Solo metadatos de una lista cerrada. Nunca registrar message, stack, query,
// parámetros, URL de conexión ni el objeto de error original.
export function logUnexpectedError(error: unknown) {
  const pending: unknown[] = [error];
  const seen = new Set<object>();
  const causes: { type: string; code?: string }[] = [];
  while (pending.length && causes.length < 8) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const value = current as {
      name?: unknown;
      code?: unknown;
      cause?: unknown;
      error?: unknown;
      errors?: unknown;
    };
    causes.push({
      type:
        typeof value.name === "string" && knownNames.has(value.name)
          ? value.name
          : "UnknownError",
      ...(typeof value.code === "string" && knownCodes.has(value.code)
        ? { code: value.code }
        : {}),
    });
    pending.push(value.cause, value.error);
    if (Array.isArray(value.errors)) pending.push(...value.errors.slice(0, 8));
  }
  console.error("No se pudo completar una operación del servidor.", { causes });
}
