import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowed = {
  users: [],
  auth: ["users"],
  teams: ["users"],
  invitations: ["teams", "users"],
  "work-sessions": ["teams", "users", "gantt"],
  gantt: ["teams", "users"],
  documents: ["teams", "users"],
};
function filesUnder(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? filesUnder(path.join(directory, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [path.join(directory, entry.name)]
          : [],
    );
}
function resolveImport(from, specifier, sourceRoot) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/"))
    return undefined;
  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(from), specifier);
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}
function importsOf(source) {
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push({ node, specifier: node.moduleSpecifier.text });
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      const arg = node.arguments[0];
      imports.push({
        node,
        specifier: arg && ts.isStringLiteral(arg) ? arg.text : undefined,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}
function foreignSchemaIsOnlyFK(source, importNode) {
  if (!ts.isImportDeclaration(importNode)) return false;
  const bindings = importNode.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) return false;
  const importedNames = new Set(
    bindings.elements.map((element) => element.name.text),
  );
  let safe = true;
  function visit(node) {
    if (node === importNode) return;
    if (ts.isIdentifier(node) && importedNames.has(node.text)) {
      let parent = node.parent;
      let inReferences = false;
      while (parent) {
        if (
          ts.isCallExpression(parent) &&
          ts.isPropertyAccessExpression(parent.expression) &&
          parent.expression.name.text === "references"
        ) {
          inReferences = true;
          break;
        }
        parent = parent.parent;
      }
      if (!inReferences) safe = false;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return safe;
}

export function checkArchitecture(sourceRoot) {
  const files = filesUnder(sourceRoot);
  const edges = new Map();
  const errors = [];
  for (const file of files) {
    const relative = path.relative(sourceRoot, file).replaceAll("\\", "/");
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const imports = importsOf(source);
    const moduleName = relative.match(/^modules\/([^/]+)\//)?.[1];
    const base = path.basename(file);
    const fail = (message) => errors.push(`${relative}: ${message}`);
    edges.set(file, []);
    if (
      (/^(service|repository|tokens|request)\.ts$/.test(base) ||
        /^shared\/(mail|session|rate-limit)\/index\.ts$/.test(relative) ||
        ["shared/db/index.ts", "shared/config/env.ts"].includes(relative)) &&
      !imports.some((entry) => entry.specifier === "server-only")
    )
      fail('Falta import "server-only".');
    if (
      base === "actions.ts" &&
      !source.statements.some(
        (node) =>
          ts.isExpressionStatement(node) &&
          ts.isStringLiteral(node.expression) &&
          node.expression.text === "use server",
      )
    )
      fail('Falta "use server".');
    for (const entry of imports) {
      if (!entry.specifier) {
        fail("No se permiten imports dinámicos con rutas calculadas.");
        continue;
      }
      const target = resolveImport(file, entry.specifier, sourceRoot);
      if (
        (entry.specifier.startsWith(".") || entry.specifier.startsWith("@/")) &&
        !target &&
        !entry.specifier.endsWith(".css")
      )
        fail(`Import local sin resolver: ${entry.specifier}`);
      if (!target) {
        if (
          entry.specifier.startsWith("drizzle-orm") &&
          !(
            base === "schema.ts" ||
            base === "repository.ts" ||
            relative === "shared/db/index.ts"
          )
        )
          fail(
            "Drizzle solo puede usarse en schemas, repositories y la conexión.",
          );
        continue;
      }
      edges.get(file).push(target);
      const targetRelative = path
        .relative(sourceRoot, target)
        .replaceAll("\\", "/");
      const targetModule = targetRelative.match(/^modules\/([^/]+)\//)?.[1];
      const foreignFK =
        moduleName &&
        targetModule &&
        moduleName !== targetModule &&
        base === "schema.ts" &&
        path.basename(target) === "schema.ts" &&
        foreignSchemaIsOnlyFK(source, entry.node);
      if (
        moduleName &&
        targetModule &&
        moduleName !== targetModule &&
        !foreignFK
      ) {
        if (!allowed[moduleName]?.includes(targetModule))
          fail(`Dependencia prohibida: ${moduleName} -> ${targetModule}`);
        if (targetRelative !== `modules/${targetModule}/index.ts`)
          fail(`Importá ${targetModule} únicamente por su index.ts.`);
      }
      const isVisual =
        relative.startsWith("app/") ||
        relative.includes("/components/") ||
        relative.startsWith("shared/ui/");
      if (
        isVisual &&
        (path.basename(target) === "repository.ts" ||
          targetRelative.startsWith("shared/db/"))
      )
        fail(
          "Una página/componente no puede importar un repository ni la base.",
        );
      if (
        isVisual &&
        targetModule &&
        !targetRelative.includes("/components/") &&
        !["actions.ts", "schemas.ts"].includes(path.basename(target)) &&
        !entry.node.importClause?.isTypeOnly
      )
        fail("La UI accede a módulos por actions o componentes.");
      if (
        base === "repository.ts" &&
        targetModule &&
        targetModule !== moduleName
      )
        fail("Un repository solo accede a sus propias tablas.");
      if (
        base === "repository.ts" &&
        path.basename(target) === "schema.ts" &&
        path.dirname(target) !== path.dirname(file)
      )
        fail("Un repository no puede importar schemas agregados ni ajenos.");
      if (
        base === "repository.ts" &&
        targetModule &&
        ["service.ts", "index.ts", "actions.ts"].includes(path.basename(target))
      )
        fail("Un repository no puede llamar a services ni actions.");
      if (base === "service.ts" && targetRelative.startsWith("shared/db/"))
        fail("Un service accede a datos por su repository.");
      if (
        moduleName &&
        base === "index.ts" &&
        path.basename(target) !== "service.ts"
      )
        fail("La API pública del módulo solo exporta su service.");
      if (
        moduleName &&
        targetModule === moduleName &&
        base !== "repository.ts" &&
        base !== "schema.ts" &&
        path.basename(target) === "schema.ts"
      )
        fail("Las tablas solo se importan desde schema.ts o repository.ts.");
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(file, trail) {
    if (visiting.has(file)) {
      errors.push(
        `Dependencia circular: ${[...trail, file].map((item) => path.relative(sourceRoot, item)).join(" -> ")}`,
      );
      return;
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const target of edges.get(file) ?? []) visit(target, [...trail, file]);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of files) visit(file, []);
  return errors;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = checkArchitecture(path.join(root, "src"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "Arquitectura verificada: límites de módulos, consultas, server-only y ausencia de ciclos.",
    );
}
