import "server-only";
import { envSchema } from "./env-schema";

const result = envSchema.safeParse(process.env);
if (!result.success) {
  // Deliberadamente no incluir valores de configuración en el mensaje.
  throw new Error(
    `Variables de entorno inválidas: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`,
  );
}
export const env = result.data;
