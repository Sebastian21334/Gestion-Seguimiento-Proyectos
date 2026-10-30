import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkArchitecture } from "../scripts/check-architecture.mjs";

const directories: string[] = [];
function fixture(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "equipo-arch-"));
  directories.push(root);
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  return root;
}
afterEach(() => {
  for (const root of directories.splice(0)) {
    const resolved = path.resolve(root);
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith("equipo-arch-")
    )
      throw new Error("Ruta temporal fuera del directorio de la prueba");
    fs.rmSync(resolved, { recursive: true });
  }
});
describe("comprobador de arquitectura", () => {
  it("detecta acceso desde una página y repository ajeno por ruta relativa", () => {
    const root = fixture({
      "app/page.tsx": 'import "../modules/users/repository";',
      "modules/users/repository.ts": 'import "server-only";',
      "modules/teams/service.ts":
        'import "server-only"; import "../users/repository";',
    });
    expect(checkArchitecture(root).join("\n")).toMatch(/página\/componente/);
    expect(checkArchitecture(root).join("\n")).toMatch(
      /únicamente por su index/,
    );
  });
  it("detecta ciclos a través de archivos compartidos", () => {
    const root = fixture({
      "shared/a.ts": 'export * from "./b";',
      "shared/b.ts": 'import "./a";',
    });
    expect(checkArchitecture(root).join("\n")).toMatch(/circular/);
  });
  it("permite tablas ajenas solo para claves foráneas", () => {
    const valid = fixture({
      "modules/users/schema.ts": "export const users = {};",
      "modules/teams/schema.ts":
        'import {users} from "../users/schema"; const column = something.references(() => users.id);',
    });
    expect(checkArchitecture(valid)).toEqual([]);
    fs.appendFileSync(
      path.join(valid, "modules/teams/schema.ts"),
      " const query = users.email;",
    );
    expect(checkArchitecture(valid).join("\n")).toMatch(
      /únicamente por su index/,
    );
  });
});
