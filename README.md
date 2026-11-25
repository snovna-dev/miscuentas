<p align="center">
  <img src="public/logo.svg" width="88" alt="Logo de MizCuentas" />
</p>

<h1 align="center">MizCuentas</h1>

<p align="center">
  Finanzas personales claras, mes a mes: ingresos, gastos fijos automáticos,<br/>
  gastos variables y pagos programados a futuro, en pesos colombianos.
</p>

<p align="center">
  <code>v3.7.5</code> · Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · MySQL 8
</p>

---

## Tabla de contenido

1. [¿Qué es MizCuentas?](#qué-es-mizcuentas)
2. [Funcionalidades](#funcionalidades)
3. [Cómo funcionan los meses (regla de fechas)](#cómo-funcionan-los-meses-regla-de-fechas)
4. [Tecnologías](#tecnologías)
5. [Instalación y puesta en marcha](#instalación-y-puesta-en-marcha)
6. [Variables de entorno](#variables-de-entorno)
7. [Scripts](#scripts)
8. [Estructura del proyecto](#estructura-del-proyecto)
9. [Modelo de datos](#modelo-de-datos)
10. [API](#api)
11. [Seguridad](#seguridad)
12. [Diseño, UX y accesibilidad](#diseño-ux-y-accesibilidad)
13. [Bases de datos con límite de conexiones (Clever Cloud)](#bases-de-datos-con-límite-de-conexiones-clever-cloud)
14. [Despliegue](#despliegue)
15. [Solución de problemas](#solución-de-problemas)
16. [Historial de cambios de esta versión](#historial-de-cambios-de-esta-versión)

---

## ¿Qué es MizCuentas?

MizCuentas es una aplicación web para administrar las finanzas personales por **mes**. Cada usuario registra:

- **Ingresos** (salario, honorarios, ventas…).
- **Gastos fijos**: compromisos que se repiten cada mes (arriendo, servicios, créditos, suscripciones). Se registran **automáticamente** al llegar cada mes como *pendientes*.
- **Gastos variables**: gastos ocasionales (comida, salidas, compras…). Pueden registrarse con una **fecha futura** y quedan en el mes de esa fecha.

El tablero muestra, para el mes elegido, los ingresos, el total de gastos, lo pagado, lo pendiente (incluyendo lo vencido de meses anteriores) y el **dinero disponible**.

Existen dos roles:

| Rol | Puede |
|---|---|
| **Usuario** | Gestionar únicamente su propia información. |
| **Administrador** (`sw_admin = 1`) | Gestionar categorías y períodos globales, consultar/corregir información de los usuarios y administrar cuentas. |

---

## Funcionalidades

### Para el usuario
- **Registro e inicio de sesión** con validación en vivo, medidor de fortaleza de contraseña y sesión automática al registrarse.
- **Onboarding guiado** en 5 pasos (bienvenida → cuenta bancaria → ingreso → gastos fijos → resumen), con barra de progreso, opción de volver atrás, omitir pasos y **retomar donde quedó**.
- **Tablero mensual**
  - Navegación entre meses (anterior / siguiente / “Hoy”) con la URL sincronizada (`?m=2026-12`).
  - Tarjetas con ingresos, gastos, por pagar y disponible (cifras animadas).
  - Lista de gastos con filtros (*Todos / Pendientes / Pagados*), búsqueda, íconos por categoría y avisos de vencimiento (“Vence hoy”, “Venció hace 3 días”).
  - Marcar como pagado / pendiente con un toque (actualización optimista y confeti al dejar el mes al día).
  - **Pendientes de meses anteriores** destacados.
  - **Próximos gastos**: los registrados con fecha futura.
  - En meses futuros: gastos ya programados + **gastos fijos proyectados**.
  - Distribución del gasto por categoría.
  - Formulario rápido de gasto variable con aviso en vivo del mes donde quedará registrado.
- **Ingresos**: registro con sugerencias rápidas, historial agrupado por mes, promedio mensual, edición y eliminación.
  - **Ingresos recurrentes**: activa “Repetir cada mes” (p. ej. el salario) y se registra solo el mismo día de cada mes. Se puede editar (aplica desde el mes en curso) o dejar de repetir.
- **Gastos fijos**: alta, edición (actualiza los pagos pendientes desde el mes actual) y eliminación lógica (deja de repetirse, conserva el historial).
  - **Frecuencia**: mensual, bimestral, trimestral, semestral o anual (p. ej. SOAT o impuesto predial).
  - **Cuotas**: créditos o compras a plazos con número de cuotas; muestra “Cuota 3/12” y deja de generarse al terminar.
  - Total expresado como **equivalente mensual** (un gasto anual suma 1/12 a cada mes).
- **Presupuestos por categoría**: límite mensual por categoría con barra de progreso; alerta al llegar al **80 %** y al **superarlo** (al registrar el gasto, en el tablero y en la campana).
- **Metas de ahorro**: crea metas con valor y fecha objetivo, aporta o retira dinero, mira el historial y cuánto debes ahorrar al mes para llegar a tiempo. Celebra al cumplirla. Los aportes del mes se descuentan del disponible.
- **Saldo por cuenta bancaria**: cada cuenta tiene saldo inicial y un libro de movimientos. Los ingresos suman, los pagos de gastos y los aportes a metas restan, y puedes registrar ajustes o **transferencias** entre tus cuentas.
- **Reportes**: evolución de 3, 6 o 12 meses (gráfico de barras con tooltip y vista de tabla), comparación con el mes anterior, gasto por categoría y exportación a **Excel (.xlsx)** o **PDF** (vista de impresión).
- **Recordatorios**: campana con pagos que vencen pronto, vencidos y alertas de presupuesto; notificaciones del navegador; y **correo diario** con los pagos próximos y vencidos (configurable: activar/desactivar y días de anticipación).
- **Mi perfil y seguridad**: editar nombre, cambiar correo (con nueva verificación y aviso al correo anterior), cambiar contraseña, cerrar las demás sesiones y **verificación en dos pasos** (TOTP con QR y 8 códigos de recuperación).
- **Recuperar contraseña** por correo (enlace de un solo uso, 30 minutos) y **verificación de correo** al registrarse.
- **Modo claro / oscuro** (respeta la preferencia del sistema), barra lateral en escritorio y barra inferior + menú “Más” y botón flotante en celular.

### Para el administrador
- Panel con secciones: **Usuarios, Categorías, Períodos, Ingresos, Gastos, Gastos por mes y Cuentas**.
- Tablas con búsqueda, edición en diálogo y confirmación antes de eliminar.
- Protecciones: no se puede eliminar una categoría o un período con gastos asociados, ni la propia cuenta de administrador.

---

## Cómo funcionan los meses (regla de fechas)

> **La fecha de un gasto define el mes en el que queda registrado.**

Esta regla es la misma para **gastos fijos y variables**:

| Fecha ingresada (hoy = 24 nov 2026) | Mes donde queda registrado | Efecto en el tablero de noviembre |
|---|---|---|
| 20 nov 2026 | Noviembre 2026 | Suma a los gastos del mes |
| **18 dic 2026 (futura)** | **Diciembre 2026** | No afecta noviembre; aparece en *Próximos gastos* |
| 10 ene 2027 (futura) | Enero 2027 (el período se crea solo) | Aparece en *Próximos gastos* |
| 31 oct 2026 (pasada) | Octubre 2026 | Aparece en *Pendientes de meses anteriores* |

Detalles importantes:

- **Los períodos se crean automáticamente.** Si un gasto tiene fecha en un mes (o año) que aún no existe en la tabla `periods`, el servidor crea el año y el mes al vuelo. El administrador ya no tiene que crearlos antes.
- **El servidor decide el período**, nunca el navegador: el cliente solo envía la fecha.
- **Zona horaria de negocio** (`APP_TIMEZONE`, por defecto `America/Bogota`). Tanto el servidor como el navegador usan la misma fecha de “hoy”, así un gasto registrado a las 9 p. m. del 30 de noviembre no termina en diciembre por la diferencia con UTC.
- **Gastos fijos automáticos.** Al abrir el tablero en el mes en curso se registran (una sola vez por usuario y mes, controlado por la tabla `period_generations`) los gastos fijos activos cuya fecha de inicio sea anterior o igual a ese mes. El día de pago se ajusta al mes (un fijo del 31 queda el 28 de febrero). Esto funciona aunque el mes ya tenga gastos futuros registrados.
- **Fijos con fecha pasada.** Si se crea un gasto fijo con fecha anterior, también se agrega a los meses posteriores ya generados.
- **Editar la fecha** de un gasto registrado a otro mes lo **mueve** a ese mes.

---

## Tecnologías

| Capa | Herramientas |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (Pages Router, React Compiler), [React 19](https://react.dev/) |
| Lenguaje | TypeScript 5 (modo estricto) |
| Estilos | Tailwind CSS 4, `tw-animate-css`, tokens de diseño propios (OKLCH) |
| Componentes | Primitivas accesibles de [Radix UI](https://www.radix-ui.com/) (Dialog, AlertDialog, Select, DropdownMenu), íconos [Lucide](https://lucide.dev/) |
| Tipografía | Geist / Geist Mono (`next/font`, autoalojada) |
| Base de datos | MySQL 8 con [`mysql2`](https://www.npmjs.com/package/mysql2) (pool + transacciones) |
| Seguridad | `bcryptjs` (12 rondas), cookies `httpOnly`, CSP y cabeceras de seguridad, TOTP propio (RFC 6238) |
| Correo y QR | [`nodemailer`](https://nodemailer.com/) (SMTP) y [`qrcode`](https://www.npmjs.com/package/qrcode) para configurar 2FA |
| Reportes | Gráfico SVG propio (paleta validada para daltonismo) y generador `.xlsx` sin dependencias (`src/lib/xlsx.ts`) |

---

## Instalación y puesta en marcha

### Requisitos
- Node.js **20.9 o superior** (probado con Node 22) y npm.
- MySQL **8.x**.

### Pasos

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local     # en Windows: copy .env.example .env.local
#    → edita .env.local con tus datos de MySQL y del administrador

# 3. Crear la base de datos (una sola vez)
#    CREATE DATABASE miscuentas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. Estructura de la base de datos
npm run migrate

# 5. Datos iniciales (estados, categorías y administrador)
npm run seed

# 6. Desarrollo
npm run dev          # http://localhost:3000
```

> `npm run seed` es **idempotente**: puede ejecutarse en cada despliegue sin borrar información.

### Probar rápido con Docker (opcional)

```bash
docker run -d --name miscuentas-mysql \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=miscuentas \
  -e MYSQL_USER=miscuentas -e MYSQL_PASSWORD=cambia-esta-clave \
  -p 3306:3306 mysql:8.4
```

---

## Variables de entorno

Todas se documentan en [`.env.example`](.env.example).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DB_HOST` | Sí | Servidor MySQL |
| `DB_PORT` | Sí | Puerto (3306 por defecto) |
| `DB_USER` | Sí | Usuario de MySQL (se recomienda uno con permisos solo sobre la base de la app) |
| `DB_PASSWORD` | Sí | Contraseña de MySQL |
| `DB_NAME` | Sí | Nombre de la base de datos |
| `DB_POOL_SIZE` | No | Conexiones simultáneas del pool (por defecto **3**). Debe ser menor que el límite de tu proveedor; ver [Clever Cloud](#bases-de-datos-con-límite-de-conexiones-clever-cloud) |
| `DB_IDLE_TIMEOUT_MS` | No | Milisegundos tras los que se cierran las conexiones inactivas (15000) |
| `ADMIN_EMAIL` | No | Correo del administrador que crea el seed |
| `ADMIN_PASSWORD` | No | Contraseña del administrador (8+ caracteres, letras y números). Si es débil, el seed **no** lo crea |
| `APP_TIMEZONE` | No | Zona horaria de negocio (`America/Bogota`) |
| `TRUST_PROXY` | No | `true` solo detrás de un proxy confiable, para leer la IP real en el limitador de intentos |
| `NEXT_PUBLIC_GTM_ID` | No | ID de Google Tag Manager / Analytics. Vacío = desactivado |
| `APP_URL` | **Sí en producción** | URL pública de la app; se usa en los enlaces de los correos. Nunca se toma del encabezado `Host` (evita enlaces de recuperación falsificados) |
| `APP_SECRET` | **Sí en producción** | Secreto de 32+ caracteres: cifra (AES‑256‑GCM) los secretos de 2FA. Si se cambia, los usuarios deben volver a configurar su 2FA |
| `CRON_SECRET` | Para recordatorios | Protege `/api/cron/reminders` (mínimo 16 caracteres) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Para correos | Servidor de correo. Sin `SMTP_HOST`, en desarrollo los correos se imprimen en la consola del servidor |
| `MAIL_FROM` | No | Remitente, p. ej. `MizCuentas <no-reply@tu-dominio.com>` |

> ⚠️ Nunca subas `.env.local` al repositorio (ya está en `.gitignore`). Genera secretos con:
> `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Servidor de producción (después de `build`) |
| `npm run lint` | ESLint |
| `npm run migrate` | Ejecuta las migraciones pendientes de `db/migrations` (registra cuáles ya corrieron en la tabla `migrations`) |
| `npm run seed` | Datos iniciales idempotentes |
| `npm run db:check` | Muestra las conexiones abiertas de tu usuario de MySQL; con `-- --kill-idle` cierra las inactivas de más de 60 s |
| `npm run reminders` | Envía los recordatorios de pago por correo (llama a `/api/cron/reminders` de la app en ejecución con `CRON_SECRET`) |

### Programar los recordatorios diarios

Los correos de recordatorio se envían cuando algo llama a `/api/cron/reminders` una vez al día. Cada gasto se recuerda una sola vez como “próximo” y otra como “vencido”, así que ejecutarlo de más no duplica correos. Solo reciben correos los usuarios con el correo **verificado** y los recordatorios activados.

- **Linux (cron)**: `0 8 * * * cd /ruta/miscuentas && npm run reminders`
- **Windows (Programador de tareas)**: acción `npm run reminders` con “Iniciar en” la carpeta del proyecto, diariamente a las 8:00.
- **Vercel Cron**: agrega en `vercel.json` `{"crons":[{"path":"/api/cron/reminders","schedule":"0 13 * * *"}]}` (13:00 UTC = 8:00 en Colombia); Vercel envía `Authorization: Bearer $CRON_SECRET`.

---

## Estructura del proyecto

```text
miscuentas/
├── db/
│   └── migrations/              # 0001…0013 (SQL de MySQL, se ejecutan en orden)
├── public/                      # logo.svg, favicon.svg, site.webmanifest
├── scripts/
│   ├── migrate.ts               # ejecutor de migraciones
│   └── seed.ts                  # datos iniciales idempotentes
└── src/
    ├── components/
    │   ├── admin/               # AdminLayout, AdminTable (búsqueda + acciones)
    │   ├── brand/               # Logo e isotipo original (SVG)
    │   ├── feedback/            # PageLoader, RouteProgress, Confetti
    │   ├── finance/             # StatCard, ExpenseItem, MonthSwitcher, PeriodHint, CategoryIcon…
    │   ├── forms/               # ExpenseForm, IncomeForm, BankAccountForm, PeriodExpenseForm
    │   ├── landing/             # Página pública
    │   ├── layout/              # AppShell (app) y AuthLayout (login/registro)
    │   ├── theme/               # Modo claro/oscuro
    │   └── ui/                  # Primitivas: Button, Input, Field, MoneyInput, Dialog, Toast…
    ├── contexts/                # UserContext (sesión) y TodayContext (fecha de negocio)
    ├── emuns/                   # ExpenseCategoryType, ExpenseState, PeriodType
    ├── hooks/                   # useCategories (con caché)
    ├── lib/
    │   ├── db/                  # pool, transacciones y consultas por dominio
    │   ├── client/api.ts        # cliente HTTP del navegador
    │   ├── auth.ts              # sesiones y cookies
    │   ├── http.ts              # envoltorio de rutas API (auth, CSRF, errores)
    │   ├── validation.ts        # validación de entradas
    │   ├── rateLimit.ts         # limitador de intentos
    │   ├── ssr.ts               # protección de páginas en el servidor
    │   ├── dates.ts / format.ts # fechas (sin desfase de zona) y moneda COP
    │   └── serverTime.ts        # "hoy" en la zona horaria de negocio
    ├── pages/
    │   ├── api/                 # endpoints
    │   ├── admin/               # panel de administración
    │   ├── auth/                # logIn (con 2FA), signUp, forgot, reset, verify
    │   └── user/                # dashboard, incomes, expenses, budgets, savings, accounts, reports, profile, onboarding
    ├── styles/globals.css       # tokens de diseño, animaciones y utilidades
    └── types/                   # tipos compartidos cliente/servidor
```

---

## Modelo de datos

```text
users ─┬─< sessions · user_tokens (recuperar clave, verificar correo, reto 2FA)
       ├─< incomes >── recurring_incomes (ingresos que se repiten)
       ├─< bank_accounts ─< transactions (libro de movimientos: ingresos, pagos, ahorro, ajustes)
       ├─< expenses (definiciones; frecuencia y cuotas) >── expense_categories (globales)
       │       └─< period_expenses (registro mensual) >── periods (año → meses)
       │                     ├── expense_states (1 Pendiente · 2 Pago)
       │                     └─< reminder_log (recordatorios ya enviados)
       ├─< budgets (límite mensual por categoría)
       ├─< savings_goals ─< savings_contributions
       └─< period_generations (qué meses ya generaron fijos e ingresos recurrentes)
```

- **`expenses`** guarda la *definición* del gasto. Un fijo se repite; un variable tiene un único registro.
- **`period_expenses`** es el gasto *de un mes concreto*, con su valor, fecha y estado de pago.
- **`periods`** contiene años (`period_type = 1`) y meses (`period_type = 2`, con `parent_id` al año).
- Borrar un gasto fijo es **lógico** (`deleted_at`): deja de repetirse y conserva el historial.
- Un gasto fijo se cobra en un mes si `(mes − mes de inicio)` es múltiplo de `frequency_months` y no se han agotado sus `installments`.
- **Saldo de una cuenta** = `bank_accounts.account_balance` (saldo inicial) + suma de sus `transactions`. Al marcar un gasto como pagado se registra un movimiento negativo en la cuenta (la principal si no se elige otra); al desmarcarlo se elimina.
- **Disponible del mes** = ingresos (+ recurrentes proyectados) − gastos (+ fijos proyectados) − aportes a metas de ahorro.

Migraciones nuevas en esta versión:

| Migración | Propósito |
|---|---|
| `0012_create_period_generations.sql` | Control de generación de gastos fijos por usuario y mes |
| `0013_add_performance_indexes.sql` | Índices para las consultas del tablero, ingresos por fecha y sesiones |
| `0014_create_budgets.sql` | Presupuesto mensual por categoría |
| `0015_create_recurring_incomes.sql` | Ingresos recurrentes y su relación con `incomes` |
| `0016_add_expense_frequency.sql` | Frecuencia y número de cuotas de los gastos fijos |
| `0017_create_savings.sql` | Metas de ahorro y aportes |
| `0018_extend_transactions_ledger.sql` | `transactions` como libro de movimientos por cuenta |
| `0019_create_user_tokens_and_reminders.sql` | Tokens de un solo uso, preferencias y registro de recordatorios |

---

## API

Todas las rutas responden JSON. Las marcadas con 🔒 requieren sesión; 🛡️ requieren administrador. El usuario **siempre** se obtiene de la cookie de sesión: cualquier `id` de usuario enviado en el cuerpo se ignora.

| Método y ruta | Descripción |
|---|---|
| `POST /api/signup` | Crea la cuenta e inicia sesión |
| `POST /api/login` | Inicia sesión (limitado a 8 intentos por cuenta / 30 por IP cada 15 min) |
| `POST /api/logout` | Cierra la sesión |
| `GET /api/me` | Usuario de la sesión o `null` |
| 🔒 `GET /api/dashboard?year&month` | Todo el tablero del mes en una sola respuesta |
| 🔒 `GET/POST/PUT/DELETE /api/incomes` | Ingresos propios (`?year&month` para filtrar) |
| 🔒 `GET/POST/PUT/DELETE /api/expenses` | Definiciones de gastos (`?type=fixed` para los fijos) |
| 🔒 `POST /api/periodExpenses` | Crea un gasto **en el mes de su fecha**. Cuerpo: `{ kind: "fixed" \| "variable", expense: {...} }` |
| 🔒 `PUT /api/periodExpenses` | Cambia estado, valor, fecha (mueve de mes) y, en variables, nombre/categoría |
| 🔒 `DELETE /api/periodExpenses` | Elimina un gasto del mes |
| 🔒 `GET/POST/PUT/DELETE /api/bankAccount` | Cuentas propias |
| 🔒 `GET/POST /api/onBoarding` | Estado del onboarding / marcarlo completo |
| 🔒 `GET /api/categories` · 🛡️ `POST/PUT/DELETE` | Categorías |
| 🔒 `GET /api/periods` · 🛡️ `POST/PUT/DELETE` | Períodos |
| 🛡️ `GET/POST/DELETE /api/users` | Usuarios (sin contraseñas) |
| `POST /api/login/2fa` | Segundo paso del login: `{ challenge, code }` (código de la app o de recuperación) |
| `POST /api/auth/forgot` | Envía el enlace para restablecer la contraseña (respuesta idéntica exista o no el correo) |
| `GET/POST /api/auth/reset` | Valida el enlace / guarda la nueva contraseña y cierra todas las sesiones |
| `POST /api/auth/verify-email` | Confirma el correo (`{ token }`) o reenvía el enlace (`{ resend: true }`) |
| 🔒 `GET/PUT/POST /api/profile` | Perfil y preferencias; acciones `password`, `email`, `logout-others` |
| 🔒 `POST/PUT/DELETE /api/profile/two-factor` | Iniciar (QR), confirmar (códigos de recuperación) y desactivar 2FA |
| 🔒 `GET/PUT/DELETE /api/budgets` | Presupuestos con lo gastado del mes |
| 🔒 `GET/POST/PUT/DELETE /api/recurringIncomes` | Ingresos recurrentes (DELETE = dejar de repetir) |
| 🔒 `GET/POST/PUT/DELETE /api/savings` | Metas de ahorro |
| 🔒 `GET/POST/DELETE /api/savings/contributions` | Aportes (positivo) y retiros (negativo) |
| 🔒 `GET/POST/PUT/DELETE /api/accounts` | Saldos, movimientos (`?accountId`), ajustes/transferencias y saldo inicial |
| 🔒 `GET /api/reports?months=6` (3, 6 o 12) | Evolución mensual, categorías y comparación con el mes anterior |
| 🔒 `GET /api/reports/export?months=…` | Descarga en Excel (.xlsx) |
| 🔒 `GET /api/notifications` | Vencimientos, alertas de presupuesto y avisos de la cuenta |
| `GET/POST /api/cron/reminders` | Envía recordatorios por correo (requiere `Authorization: Bearer CRON_SECRET`) |

Ejemplo — registrar un gasto variable con fecha futura:

```http
POST /api/periodExpenses
Content-Type: application/json

{ "kind": "variable",
  "expense": { "expense_category_id": 12, "name": "Concierto", "description": "",
               "expense_date": "2026-12-18", "amount": 320000 } }
```

```json
{ "success": true, "id": 42,
  "period": { "id": 3, "year": 2026, "month": 12, "label": "Diciembre 2026" },
  "relative": "future", "budgetAlert": null }
```

Errores: `{ "error": "mensaje para el usuario" }` con códigos `400` (validación), `401` (sin sesión), `403` (permisos/origen), `404` (no existe o no es tuyo), `409` (duplicado o en uso), `415`, `429` (demasiados intentos) y `500` (con un código de referencia; el detalle técnico solo queda en el log del servidor).

---

## Seguridad

Mejoras aplicadas en esta versión:

| Riesgo encontrado | Solución |
|---|---|
| **Acceso a datos de otros usuarios (IDOR)**: cualquiera podía editar o borrar ingresos, gastos y cuentas ajenas enviando otro `id`, y consultar gastos ajenos con `?userId=` | Todas las consultas filtran por el usuario de la sesión (`404` si el registro no es suyo); `?userId=` solo para administradores |
| El cliente enviaba el `id` de usuario y el `periodId` al crear registros | El servidor ignora esos valores y usa la sesión y la fecha |
| **`GET /api/users` devolvía todos los usuarios con hash de contraseña** a cualquier usuario autenticado; “eliminar usuario” borraba un período | Endpoint solo para administradores, sin campos sensibles; eliminación correcta y sin auto‑borrado |
| Categorías y períodos (globales) podían ser modificados por cualquier usuario | Solo administradores |
| Borrar una categoría o período eliminaba en cascada los gastos de todos los usuarios | Se bloquea si tiene datos asociados (`409`) |
| **El seed borraba `expense_states` y `expense_categories`** → por `ON DELETE CASCADE` eliminaba **todos los gastos** en cada despliegue | Seed idempotente (inserta solo lo que falta, ids fijos para estados) |
| Transacciones falsas (`BEGIN`/`COMMIT` sobre el pool → cada sentencia en una conexión distinta) | `withTransaction` sobre una única conexión |
| Enumeración de usuarios (“Usuario no encontrado” vs “Contraseña incorrecta”) | Mensaje único y tiempo de respuesta igualado |
| Sin límite de intentos de login/registro | Limitador por cuenta e IP |
| Contraseñas sin política (se aceptaba “123”) | 8+ caracteres con letras y números; bcrypt de 10 → 12 rondas |
| Mensajes de error con detalles internos de SQL | Mensajes genéricos + código de referencia en el log |
| Sin protección CSRF adicional | Verificación de `Origin` y exigencia de `Content-Type: application/json` en mutaciones (además de `SameSite=Lax`) |
| Sin cabeceras de seguridad | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS en producción; se ocultó `X-Powered-By` |
| Páginas de administrador protegidas solo en el navegador | Protección en el servidor (`getServerSideProps`) con redirección |
| Token de sesión devuelto en el cuerpo del login | Solo viaja en la cookie `httpOnly` |
| Cuerpos de petición sin límite / sin validación de tipos | Límite de 32 KB y validación estricta de montos, fechas, textos e ids |
| Dependencias innecesarias (`sqlite3` nativo, `cn`, `react-icons`, `@radix-ui/react-select`) | Eliminadas |
| Sin forma de recuperar la cuenta | Recuperación por correo con token aleatorio de un solo uso (solo se guarda su hash SHA‑256), 30 min de validez, límite de intentos, respuesta idéntica exista o no el correo y cierre de todas las sesiones al cambiar la clave |
| Correos sin verificar | Verificación por enlace (24 h). Al cambiar el correo se exige la contraseña, se avisa al correo anterior y se vuelve a verificar |
| Solo contraseña | Verificación en dos pasos TOTP (RFC 6238) con secreto **cifrado** (AES‑256‑GCM) en la base de datos, reto de login de 5 min, 5 intentos por reto y códigos de recuperación de un solo uso guardados como hash |
| Enlaces de correo construidos con el encabezado `Host` (envenenamiento) | Se usa siempre `APP_URL` |
| Endpoint de tareas programadas expuesto | `/api/cron/reminders` exige `CRON_SECRET` comparado en tiempo constante |
| Exportación a Excel con riesgo de inyección de fórmulas | Los textos que empiezan con `=`, `+`, `-` o `@` se neutralizan |

Recomendaciones operativas: usar un usuario de MySQL con permisos mínimos, HTTPS obligatorio, respaldos automáticos de la base de datos y `TRUST_PROXY=true` solo detrás de un proxy confiable.

---

## Diseño, UX y accesibilidad

- **Identidad visual original**: isotipo de una “M” cuyo último trazo se convierte en una flecha de crecimiento, con una moneda dorada (ahorro). Paleta esmeralda/teal en OKLCH con modo oscuro completo.
- **Animaciones** con propósito: entrada escalonada de tarjetas, cifras que cuentan hasta su valor, check que se dibuja al pagar, confeti al dejar el mes al día, diálogos tipo “hoja” en celular y barra de progreso al navegar. Todas respetan `prefers-reduced-motion`.
- **Cargas**: esqueletos (skeletons) en lugar de bloquear la pantalla, loader de marca solo en cargas completas y botones con estado “Guardando…” que evitan envíos dobles.
- **Formularios**: etiquetas claras, campos obligatorios marcados, validación en vivo, campo de dinero con formato `$ 1.250.000`, sugerencias rápidas, aviso del mes de registro y foco automático para registrar varios elementos seguidos.
- **Notificaciones** (toasts) accesibles con `aria-live` en lugar de mensajes como “Ingreso con ID 12 registrado”.
- **Accesibilidad**: enlace “Saltar al contenido”, foco visible, roles ARIA en pestañas, barras de progreso y diálogos, textos alternativos y contraste adecuado.
- **Rendimiento**: el tablero pasó de hasta 7 peticiones encadenadas a 1; la sesión se valida una vez en el servidor (antes cada pantalla y formulario llamaba a `/api/me`); categorías en caché; pool de conexiones reutilizado en desarrollo; índices nuevos.

---

## Bases de datos con límite de conexiones (Clever Cloud)

El plan gratuito de MySQL en Clever Cloud permite **5 conexiones simultáneas por usuario** (`max_user_connections`), y ese cupo lo comparten **todos** los clientes que usan el mismo usuario: la app desplegada, tu `npm run dev`, PhpMyAdmin y los scripts. Si se supera, MySQL responde `ER_USER_LIMIT_REACHED` y las pantallas quedan sin datos.

Cómo lo maneja la app:

- Un **único pool por proceso** con `DB_POOL_SIZE` conexiones (3 por defecto). Si llegan más consultas, **esperan su turno** en lugar de abrir conexiones nuevas.
- Las conexiones **inactivas se cierran** a los `DB_IDLE_TIMEOUT_MS` (15 s) para liberar cupos.
- Si MySQL rechaza una conexión por falta de cupo, la app **reintenta** hasta 4 veces (≈ 4 s); si persiste, responde `503` con un mensaje amable en lugar de un error genérico.
- `npm run migrate` usa una sola conexión.

Recomendaciones:

| Escenario | `DB_POOL_SIZE` |
|---|---|
| Solo producción | 3–4 |
| Producción + desarrollo local con la **misma** base | 2 en cada una |
| Varias instancias o despliegue serverless (cada instancia tiene su pool) | 1–2, o usa una base distinta para desarrollo |

Si aparece el error: ejecuta `npm run db:check` para ver quién ocupa las conexiones (origen e inactividad). Con `npm run db:check -- --kill-idle` se cierran las inactivas. Si ni siquiera hay cupo para el diagnóstico, detén los servidores locales, reinicia la app desplegada (las versiones anteriores usaban un pool de 10) o reinicia el add-on desde la consola de Clever Cloud.

> 💡 Lo ideal es usar una base de datos aparte para desarrollo (por ejemplo MySQL local o en Docker) y dejar la de Clever Cloud solo para producción.

---

## Despliegue

```bash
npm ci
npm run migrate
npm run seed
npm run build
npm start
```

Orden obligatorio: dependencias → variables de entorno → MySQL disponible → migraciones → seed → build/start.

---

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `ECONNREFUSED` al migrar | MySQL no está corriendo o `DB_HOST`/`DB_PORT` son incorrectos |
| El seed dice que no creó el administrador | `ADMIN_PASSWORD` es débil o falta `ADMIN_EMAIL` |
| “Demasiados intentos” al iniciar sesión | Límite de seguridad: espera 15 minutos |
| `ER_USER_LIMIT_REACHED` / “El servidor está ocupado” | Se agotaron las conexiones permitidas por el proveedor: baja `DB_POOL_SIZE` y revisa con `npm run db:check` ([detalles](#bases-de-datos-con-límite-de-conexiones-clever-cloud)) |
| “Origen no permitido” | La petición viene de otro dominio, o un proxy reescribe el `Host` (configura `x-forwarded-host`) |
| Los gastos fijos no aparecen en el mes | Se generan al abrir el tablero del mes en curso; revisa que la fecha de inicio del fijo no sea posterior |

---

## Historial de cambios de esta versión

- Gastos variables con fecha futura registrados en el mes de su fecha (misma regla que los fijos) y creación automática de períodos.
- Generación de gastos fijos robusta (`period_generations`), ajuste de día por mes y propagación de fijos con fecha pasada.
- Corrección: los “pendientes de meses anteriores” incluían meses futuros.
- Corrección: fechas mostradas un día antes por la zona horaria; fecha por defecto en UTC que podía mover gastos de mes.
- Corrección: editar ingresos y gastos fijos no funcionaba (el cliente enviaba `Income`/`Expense` y la API esperaba `income`/`expense`).
- Rediseño completo (landing, autenticación, onboarding, tablero, ingresos, gastos fijos y administración), logo original y modo oscuro.
- Endurecimiento de seguridad (ver sección [Seguridad](#seguridad)).
- **Nuevas funciones**: presupuestos por categoría con alertas, ingresos recurrentes, gastos fijos con frecuencia y cuotas, metas de ahorro, saldo por cuenta con movimientos y transferencias, reportes con exportación a Excel y PDF, recordatorios (campana, navegador y correo), perfil con cambio de correo/contraseña, recuperación de contraseña, verificación de correo y verificación en dos pasos.
- Navegación con barra lateral en escritorio y menú “Más” en celular.

---

## Licencia

Proyecto destinado al desarrollo y aprendizaje de una aplicación de gestión financiera. © Snovna.
