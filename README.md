# 🏠 Gastos de la casa

App web mobile-first para llevar los gastos compartidos de la casa entre dos personas (por defecto **Tony** y **Sol**, editables). Registra gastos, préstamos y devoluciones, calcula quién le debe a quién y permite **cerrar períodos** para dejar la cuenta en cero y empezar de nuevo.

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Base de datos: Google Sheets** (con service account, todo server-side)
- **Lectura de tickets con OpenAI** (visión + salida estructurada)
- **Login simple con PIN**
- Pensada para **deploy en Vercel**

> 💡 **Modo demo sin configurar nada:** si no cargás las credenciales de Google Sheets, la app arranca igual usando un almacenamiento **en memoria** (se pierde al reiniciar). Ideal para probar la interfaz. El PIN por defecto es `1234`.

---

## 🧠 Cómo funciona el balance

Todo se mide como **"cuánto le debe Sol a Tony"**:

- **Gasto pagado por Tony, dividido 50/50** → Sol le debe a Tony la mitad.
- **Gasto pagado por Sol** → Tony le debe a Sol su parte.
- **Tony le presta $20.000 a Sol** → Sol le debe $20.000 más a Tony.
- **Sol le devuelve $10.000 a Tony** → esa deuda baja $10.000.

Al **cerrar un período** la app calcula el neto y te dice: *"Para dejar la cuenta en cero, X le tiene que pagar $Y a Z"*. Guarda el cierre, marca el período como cerrado y crea uno nuevo abierto.

La lógica vive en [`src/lib/balance.ts`](src/lib/balance.ts) y está cubierta por tests ([`src/lib/balance.test.ts`](src/lib/balance.test.ts)).

---

## 🚀 Puesta en marcha (local)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Para **solo probar la UI** alcanza con dejar el `APP_PIN` (por defecto `1234`). Para guardar datos de verdad y leer tickets, completá las secciones de Google y OpenAI (más abajo).

### 3. Correr

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) e ingresá el PIN.

---

## 🔑 Variables de entorno

| Variable | Para qué |
| --- | --- |
| `APP_PIN` | PIN para entrar a la app (compartido). Default `1234`. |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión. Generá uno con `openssl rand -base64 32`. |
| `OPENAI_API_KEY` | Clave de OpenAI para leer tickets. |
| `OPENAI_MODEL` | Modelo con visión. Default `gpt-4o-mini`. |
| `GOOGLE_SHEET_ID` | ID de la hoja (lo que va entre `/d/` y `/edit` en la URL). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de la service account. |
| `GOOGLE_PRIVATE_KEY` | Clave privada de la service account (con `\n`). |

Sin las variables de Google, la app usa el **modo memoria**. Sin `OPENAI_API_KEY`, todo funciona menos el escaneo de tickets.

---

## 📊 Google Sheets como base de datos

### Paso 1 — Crear la hoja

1. Entrá a [Google Sheets](https://sheets.new) y creá una hoja nueva.
2. Copiá el **ID** de la URL:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`
3. Pegalo en `GOOGLE_SHEET_ID`.

### Paso 2 — Crear la service account en Google Cloud

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/) y creá (o elegí) un proyecto.
2. **APIs y servicios → Biblioteca** → buscá **"Google Sheets API"** → **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
4. Ponele un nombre y creala (no hace falta darle roles).
5. Entrá a la service account → pestaña **Claves → Agregar clave → Crear clave nueva → JSON**. Se descarga un archivo `.json`.
6. De ese JSON sacás:
   - `client_email` → va en `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → va en `GOOGLE_PRIVATE_KEY` (copiá el valor completo, entre comillas, tal cual con los `\n`).

### Paso 3 — Compartir la hoja con la service account

⚠️ **Este paso es clave.** La app entra a la hoja "como" la service account, así que tenés que darle permiso:

1. Abrí tu Google Sheet.
2. Botón **Compartir**.
3. Pegá el email de la service account (`...@...iam.gserviceaccount.com`).
4. Dale permiso de **Editor**.
5. Enviar.

### Paso 4 — Inicializar las pestañas

Con las variables ya cargadas en `.env.local`:

```bash
npm run init-sheets
```

Esto crea las pestañas con sus encabezados. Es idempotente (podés correrlo de nuevo sin romper nada).

### Pestañas y columnas

Si preferís crearlas a mano, estas son las pestañas (nombres exactos) y sus columnas en orden:

**`Settings`**
```
key | value
```

**`Periods`**
```
id | name | start_date | end_date | status | created_at
```

**`Expenses`**
```
id | period_id | date | description | merchant | category | total | paid_by | split_type | share_tony | share_sol | created_by | source | notes | ticket_image_url | created_at | updated_at
```

**`Loans`**
```
id | period_id | date | type | from_person | to_person | amount | notes | created_at | updated_at
```

**`Settlements`**
```
id | period_id | date | from_person | to_person | amount | notes | created_at
```

**`AuditLog`**
```
id | date | action | entity | entity_id | details
```

> La columna `ticket_image_url` queda reservada para una futura versión. En esta versión **no se guarda la imagen del ticket**, solo se usa para extraer los datos.

---

## 🤖 Lectura de tickets con OpenAI

1. Conseguí una API key en [platform.openai.com](https://platform.openai.com/api-keys) y ponela en `OPENAI_API_KEY`.
2. El modelo por defecto es `gpt-4o-mini` (barato y con visión). Podés cambiarlo con `OPENAI_MODEL`.

El flujo: sacás/subís la foto → se comprime en el celular → se manda a la API route `POST /api/ticket/analyze` (server-side) → la IA devuelve JSON estricto (comercio, fecha, total, categoría, items, confianza, advertencias) → **revisás y corregís** → recién ahí se guarda. La app nunca guarda automáticamente.

---

## 🔒 Seguridad

- Login con **PIN** (`APP_PIN`). La sesión se guarda en una cookie **httpOnly** firmada.
- El [`middleware`](src/middleware.ts) protege **todas** las rutas menos el login.
- Las claves de Google y OpenAI **solo se usan server-side**; nunca llegan al frontend.

---

## ☁️ Deploy en Vercel

1. Subí el repo a GitHub.
2. En [Vercel](https://vercel.com/new) importá el proyecto (detecta Next.js solo).
3. En **Settings → Environment Variables** cargá todas las variables del `.env.example`.
   - Para `GOOGLE_PRIVATE_KEY`, pegá el valor **con los `\n`** tal cual está en el JSON (entre comillas). La app los convierte a saltos de línea reales.
   - Poné un `SESSION_SECRET` largo y aleatorio.
4. **Deploy.**
5. Acordate de que la hoja tiene que estar **compartida con la service account** (Paso 3).

> El proyecto NO usa Supabase, Firebase ni otra base de datos: la base es Google Sheets.

---

## 🛠️ Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta la app en desarrollo. |
| `npm run build` | Build de producción. |
| `npm run start` | Sirve el build. |
| `npm run test` | Corre los tests de la lógica de balance. |
| `npm run typecheck` | Chequea tipos con TypeScript. |
| `npm run init-sheets` | Crea las pestañas y encabezados en Google Sheets. |

---

## 📁 Estructura

```
src/
  app/
    (app)/              ← pantallas protegidas (dashboard, gastos, ticket, etc.)
    api/                ← API routes (todo server-side)
    login/              ← pantalla de login
  components/           ← componentes reutilizables (formularios, UI, nav)
  lib/
    balance.ts          ← lógica central de balance (testeada)
    store/              ← acceso a datos: Google Sheets + fallback en memoria
    openai.ts           ← lectura de tickets
    auth.ts             ← sesión con PIN
    validation.ts       ← esquemas Zod
  middleware.ts         ← protección de rutas
scripts/
  init-sheets.ts        ← inicializador de la hoja
```

---

## 🧾 Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/summary` | Balance + totales del período actual. |
| `GET/POST` | `/api/expenses` | Listar / crear gastos. |
| `GET/PUT/DELETE` | `/api/expenses/:id` | Ver / editar / borrar un gasto. |
| `POST` | `/api/ticket/analyze` | Analizar la foto de un ticket. |
| `GET/POST` | `/api/loans` | Listar / crear préstamos y devoluciones. |
| `GET/PUT/DELETE` | `/api/loans/:id` | Ver / editar / borrar un movimiento. |
| `GET` | `/api/periods` | Listar períodos. |
| `POST` | `/api/periods/close` | Cerrar el período y abrir uno nuevo. |
| `GET/PUT` | `/api/settings` | Ver / editar nombres. |
| `POST` | `/api/login` · `/api/logout` | Sesión. |
