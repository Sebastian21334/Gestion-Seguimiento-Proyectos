import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
for (const route of [
  "/login",
  "/registro",
  "/registro/correo?proveedor=gmail",
  "/olvide-contrasena",
  "/restablecer?token=invalid",
  "/verificar",
]) {
  const response = await fetch(new URL(route, base), { redirect: "manual" });
  const html = await response.text();
  assert.equal(response.status, 200, route);
  assert.match(html, /<html lang="es-AR"/, route);
  assert.match(html, /<form|Iniciar sesión/, route);
  if (route.startsWith("/registro/correo")) {
    assert.match(html, /Revisá tu correo/);
    assert.match(html, /href="https:\/\/mail.google.com\/"/);
    assert.match(html, /target="_blank"/);
  }
  assert.equal(
    response.headers.get("x-content-type-options"),
    "nosniff",
    route,
  );
  if (route.startsWith("/restablecer") || route === "/verificar")
    assert.equal(response.headers.get("referrer-policy"), "no-referrer", route);
  console.log(`OK ${route}: HTML y cabeceras`);
}
for (const route of [
  "/",
  "/perfil",
  "/t/equipo-ajeno",
  "/t/equipo-ajeno/documentos",
  "/t/equipo-ajeno/miembros",
  `/invitaciones/${"a".repeat(64)}`,
]) {
  for (const invalidCookie of [false, true]) {
    const response = await fetch(new URL(route, base), {
      redirect: "manual",
      headers: invalidCookie ? { Cookie: "team_session=invalid" } : {},
    });
    const html = await response.text();
    const redirected =
      response.headers.get("location") === "/login" ||
      (html.includes("/login") &&
        (html.includes("NEXT_REDIRECT") ||
          html.includes('http-equiv="refresh"')));
    assert.ok(
      redirected,
      `${route}: debe pedir login, status=${response.status}`,
    );
  }
  console.log(`OK ${route}: protegido sin sesión y con cookie inválida`);
}
