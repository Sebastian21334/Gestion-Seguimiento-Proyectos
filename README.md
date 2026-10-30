# Equipo · Tablero de equipos

Aplicación de colaboración por equipos con Next.js App Router, TypeScript, Tailwind, Postgres en Neon y Drizzle. Autenticación propia con bcryptjs y JWT de jose. Correo mediante Azure Communication Services.

## Empezar

Requiere Node.js 22 o superior, una base Neon y un recurso Azure Communication Services Email con dominio y remitente habilitados.

```powershell
npm ci
Copy-Item .env.example .env.local
# Completar .env.local con las credenciales reales.
npm run db:migrate
npm run dev
```

Abrir http://localhost:3000 y registrar una cuenta. La verificación por correo es obligatoria antes del primer login. No se incluyen usuarios ni datos simulados.

Al completar el registro se navega a `/registro/correo`, con instrucciones, acceso a la bandeja de entrada en otra pestaña y un botón para continuar al inicio. Si no hay una sesión válida, continuar pide iniciar sesión. La URL solo incluye una preferencia de proveedor, nunca el correo, la contraseña ni tokens. La respuesta es la misma para cuentas nuevas, existentes y correos no admitidos.

Los correos de registro y reenvío usan una plantilla HTML con el nombre guardado, la identidad de `equipo.`, un botón de verificación y un enlace de respaldo. Se mantienen el texto plano y el envío directo a ACS mediante `sendEmail`.

La migración inicial está en `drizzle/`. `db:migrate` modifica la base indicada por `DATABASE_URL`: usar una base de desarrollo para la primera ejecución. `db:generate` prepara migraciones adicionales sin aplicarlas. Las migraciones se generan desde `src/shared/db/schema.ts`, que solo reexporta las definiciones de cada módulo.

## Variables de entorno

Todas las variables de aplicación se validan con Zod al iniciar, sin imprimir sus valores en los errores. Las herramientas Drizzle usan el mismo esquema. Next carga `.env.local` automáticamente.

| Variable                | Uso                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexión Postgres de Neon con SSL.                                                                             |
| `APP_URL`               | Origen público sin barra final. HTTPS obligatorio en producción.                                               |
| `ACS_CONNECTION_STRING` | Cadena `endpoint=https://…;accesskey=…` de Azure Communication Services.                                       |
| `ACS_SENDER_ADDRESS`    | Dirección habilitada del dominio de Email en ACS.                                                              |
| `SESSION_SECRET`        | Secreto aleatorio de al menos 32 caracteres para sesiones.                                                     |
| `EMAIL_TOKEN_SECRET`    | Otro secreto aleatorio de al menos 32 caracteres para verificación y recuperación.                             |
| `ALLOWED_EMAIL_DOMAINS` | Opcional; dominios separados por coma o punto y coma. Vacío admite cualquier dominio.                          |
| `TRUST_PROXY`           | `false` por defecto. Usar `true` únicamente detrás de un proxy que sobrescriba `X-Forwarded-For`, como Vercel. |

Generar cada secreto por separado con `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. No subir `.env.local` al repositorio.

Las cookies son siempre `HttpOnly`, `Secure`, `SameSite=Lax` y `path=/`, y duran 7 días. Para desarrollo, usar `localhost` en un navegador que lo considere un origen seguro, o HTTPS local. No usar una dirección HTTP de la red local para probar cookies seguras. Sin un proxy confiable, las peticiones comparten un bucket de IP conservador; los límites por correo siguen siendo independientes.

## Arquitectura

```text
src/
  app/                 Rutas, layouts y composición de páginas
  modules/
    users/             Usuarios y perfiles
    auth/              Registro, login, verificación y recuperación; sin tablas
    teams/             Equipos, miembros y requireMembership
    invitations/       Invitaciones revocables
    work-sessions/     Sesiones activas e historial
    gantt/             Diagramas y actividades planificadas
    documents/         Enlaces anteriores conservados
  shared/
    db/                Conexión y reexportación de tablas
    mail/              Único punto de integración con ACS
    rate-limit/        Tabla de intentos y reserva atómica de cupos
    errors/            Errores de dominio y adaptación a formularios
    config/            Validación de entorno
    session/           Identidad de la petición autenticada
    ui/                Componentes visuales reutilizables
```

Flujo: **página/componente → actions → service → repository → db**.

- `actions.ts`: valida entradas con Zod, obtiene la identidad del servidor, llama al service y adapta resultados/redirecciones. Las funciones de lectura también pasan por actions.
- `service.ts`: aplica permisos y reglas de negocio. Solo usa su repository y la API pública de otros módulos.
- `repository.ts`: consulta exclusivamente tablas del módulo. Sin interfaces ni contenedor de dependencias. Los joins entre tablas de módulos diferentes están prohibidos.
- `index.ts`: exporta únicamente funciones y tipos del service. Los schemas externos solo se importan desde otro `schema.ts` para claves foráneas.
- La UI combina datos a través de actions. Los services enriquecen resultados con consultas por lotes a `users`.
- Archivos de servidor marcados con `server-only`; las acciones tienen `use server`.

Dependencias entre módulos:

```text
auth          → users
teams         → users
invitations   → teams, users
work-sessions → gantt, teams, users
gantt         → teams, users
documents     → teams, users
users         → ningún otro módulo
```

`getCurrentUser()` es parte de la API pública de `auth`. Su lectura de cookie/JWT vive en `shared/session` para que las acciones de otros módulos puedan autenticar peticiones sin agregar una dependencia hacia `auth`. Consulta el usuario en cada lectura y comprueba verificación y `token_version`. `users/service.ts` no depende de la sesión.

`requireMembership(teamId, userId)` vive en `teams/service.ts`. El segundo argumento proviene de la sesión del servidor, nunca de un campo de formulario; permite conservar el grafo de dependencias. Verifica la pertenencia antes de acceder al recurso. Las invitaciones pendientes y su aceptación usan el correo verificado del destinatario, ya que esa persona todavía no pertenece al equipo. La resolución del slug busca solo el equipo y comprueba membresía antes de devolverlo.

## Comportamiento y seguridad

- JWT HS256 con `purpose`, emisor, audiencia y expiración obligatorios. Claves distintas para sesiones y enlaces. Tokens de un propósito no se aceptan para otro.
- Contraseñas de 10 a 72 caracteres y, además, máximo de 72 bytes UTF-8 para evitar truncado de bcrypt. El registro exige repetir la contraseña, valida la coincidencia en el servidor y permite mostrar u ocultar ambos campos. Costo 12; el login inexistente también compara contra un hash válido.
- Registro, reenvío y recuperación responden de forma genérica. Los fallos de correo de estos flujos no revelan si la cuenta existe. `sendEmail` siempre lanza `EmailDeliveryError` si ACS rechaza la solicitud; el service de autenticación lo adapta a la respuesta genérica.
- `sendEmail({ to, subject, html })` es el único archivo que importa el SDK de ACS. Incluye `plainText`, preserva URLs y usa `beginSend` sin llamar a `pollUntilDone`: confirma la aceptación inicial de ACS, no la entrega al destinatario.
- Reset vinculado a los primeros 16 caracteres del SHA-256 del hash actual. Actualización condicional del hash e incremento de versión en una sola sentencia: solo un reset concurrente puede ganar. GET de `/restablecer` no muta datos.
- Rate limits persistidos: login 5 por correo/20 por IP cada 15 minutos; registro, reenvío y recuperación 3/10 por hora para cada operación. Reserva atómica con locks de Postgres; intentos de login exitosos liberan solo su propia reserva. Limpieza de eventos de más de 24 horas al insertar.
- Tareas con título y descripción. El inicio usa un lock transaccional por equipo/usuario y rechaza una nueva tarea si ya existe una activa; nunca cierra la anterior automáticamente. La interfaz solo permite cerrar la tarea activa. El índice único parcial sigue siendo una garantía adicional. El driver Neon usa WebSocket/Pool para soportar transacciones interactivas.
- Resúmenes de cambios opcionales: varios archivos `.md` UTF-8 de hasta 256 KB cada uno, hasta tres por carga, en una tarea activa propia. Se guardan en Neon, sin servicio adicional, y se conservan al cerrar. Las descargas comprueban membresía y equipo; el contenido no se incluye en el polling. La migración `0002_sturdy_bloodstrike.sql` conserva los archivos anteriores.
- Tablero con SWR cada 9 segundos mientras está visible y conectado, más actualización al recuperar foco. Aviso sin bloqueo cuando dos títulos coinciden, ignorando mayúsculas.
- Gantt: varios diagramas por equipo; actividades con fechas, horas, responsable opcional y estado, movibles en la línea de tiempo. Todos pueden crear; una actividad asignada solo la modifica su responsable o el owner. Las nuevas sesiones se vinculan a una actividad propia o sin responsable. Las sesiones previas permanecen sin asociación. La antigua sección de documentos redirige al Gantt y sus registros se conservan.
- Solo owners invitan, revocan, quitan miembros, renombran y borran equipos. El owner no puede abandonarlos mientras haya otros miembros. La salida del último owner elimina el equipo.
- Invitaciones de 7 días con token aleatorio de 256 bits; solo se guarda SHA-256. Se comprueba el correo verificado y se reclama la invitación de forma condicional antes de incorporar al miembro. Si falla la incorporación, se libera la reclamación. Las dos operaciones pertenecen a módulos distintos y no comparten una transacción; un corte de proceso entre ellas requiere revisión de la invitación.
- Solo HTTP(S) para documentos; el autor o el owner puede borrarlos. Los correos de compañeros solo salen por consultas de miembros autorizadas.
- Cabecera `Referrer-Policy: no-referrer` en verificación, restablecimiento e invitaciones. Errores públicos sin SQL, tokens ni credenciales.

## Comprobaciones

GitHub Actions ejecuta las comprobaciones y la compilación en cada push y pull request, con valores de prueba. Las credenciales reales se configuran por separado en Vercel y no forman parte del repositorio.

```powershell
npm run check
npm run build
```

`check` ejecuta arquitectura, TypeScript y pruebas. El comprobador usa el árbol sintáctico de TypeScript: resuelve alias y rutas relativas, controla imports públicos, queries, claves foráneas y ciclos. Las pruebas cubren tokens intercambiados/vencidos, reset repetido y concurrente, invalidación de sesiones, verificación idempotente, permisos, invitaciones, límites, entradas y ACS sin espera de entrega.

Los scripts usan Webpack, compatible con este entorno Windows. Se fija la dependencia transitiva de esbuild del cargador de Drizzle a una versión corregida; la generación de migraciones se verifica con esa resolución.

Con el servidor iniciado, `npm run test:http` comprueba páginas públicas, cabeceras y redirecciones de rutas protegidas sin cookie y con una cookie inválida. Para otro puerto: `npm run test:http -- http://127.0.0.1:3101`.

Verificación realizada: arquitectura, TypeScript, 58 pruebas y migraciones. Los controles HTTP previos y la compilación de producción cubren las pantallas de autenticación. La revisión visual en Chrome quedó pendiente porque la herramienta no tiene autorización para controlar ese navegador. Las credenciales de prueba usadas para compilar no se guardan en la configuración de la aplicación. Las pruebas de esta actualización no envían correos reales.

Las pruebas unitarias aíslan la persistencia y ACS; no sustituyen una prueba de integración con Neon y Azure. Antes de desplegar, comprobar con dos cuentas reales: registro y verificación, recepción de enlaces, reset, invitación con correo incorrecto, acceso por URL a otro equipo, cinco fallos de login y dos inicios de trabajo simultáneos. Confirmar que la otra cuenta ve los cambios sin recargar. Hace falta una base real para verificar las transacciones y los límites concurrentes de punta a punta.

## Despliegue en Vercel

1. Subir el proyecto a un repositorio y conectarlo a Vercel como Next.js con Node.js 22 o superior.
2. Configurar todas las variables anteriores para el entorno de destino. `APP_URL` debe ser su URL HTTPS y `TRUST_PROXY=true` para el proxy de Vercel. Usar credenciales separadas para Preview si no debe tocar producción.
3. Aplicar `npm run db:migrate` con las variables de la base elegida. No se ejecutan migraciones automáticamente durante el build.
4. Compilar y desplegar con el flujo de Vercel; verificar los flujos anteriores en su dominio.

Este repositorio no crea recursos de Neon/Azure, no incorpora credenciales y no publica automáticamente en Vercel.

Documentación de las integraciones: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Drizzle con Neon](https://orm.drizzle.team/docs/connect-neon), [ACS EmailClient](https://learn.microsoft.com/en-us/javascript/api/%40azure/communication-email/emailclient?view=azure-node-latest).
