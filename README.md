# Backend — API Sistema de Gestion Academica (SGA)

API REST y panel de administracion para la gestion de informes de Jefatura de Area de la **Universidad Politecnica Salesiana**. Construido con Strapi 5, permite la creacion, seguimiento y evaluacion de informes docentes a traves de formularios dinamicos.

---

## Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| Framework | Strapi 5.49.0 (Community Edition) |
| Base de datos | SQLite (`better-sqlite3`) / PostgreSQL / MySQL |
| Lenguaje | TypeScript 5 |
| Panel admin | React 18 (bundled con Strapi) |
| PDF | pdfmake 0.3.x |
| Paquete | pnpm 9+ |

## Requisitos

- **Node.js**: >= 20.0.0, <= 26.x.x
- **pnpm**: >= 9

---

## Contenido

- [Inicio rapido](#inicio-rapido)
- [Variables de entorno](#variables-de-entorno)
- [Comandos](#comandos)
- [Configuracion](#configuracion)
  - [Servidor](#servidor)
  - [Base de datos](#base-de-datos)
  - [CORS](#cors)
  - [Panel de administracion](#panel-de-administracion)
- [Content Types](#content-types)
- [Patron EAV](#patron-eav)
- [Endpoints de la API](#endpoints-de-la-api)
- [Autenticacion y usuarios](#autenticacion-y-usuarios)
  - [Creacion del administrador del sistema](#creacion-del-administrador-del-sistema)
- [Generacion de PDF](#generacion-de-pdf)
- [Guia de construccion de formularios](#guia-de-construccion-de-formularios)
- [Seed de datos iniciales](#seed-de-datos-iniciales)
- [Migracion de datos desde pruebas a produccion](#migracion-de-datos-desde-pruebas-a-produccion)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Despliegue a produccion](#despliegue-a-produccion)
- [Base de datos: migracion a PostgreSQL](#base-de-datos-migracion-a-postgresql)
- [Respaldos](#respaldos)
- [Mantenimiento y actualizaciones](#mantenimiento-y-actualizaciones)
- [Solucion de problemas](#solucion-de-problemas)

---

## Inicio rapido

```bash
# 1. Clonar e instalar
cd backend-strapi
cp .env.example .env
pnpm install

# 2. Iniciar en modo desarrollo
pnpm dev

# 3. Abrir en el navegador
# API:    http://localhost:1337
# Admin:  http://localhost:1337/admin
```

En la primera ejecucion, crear el administrador del panel en `/admin`. Luego ejecutar el seed para poblar los tipos de formulario:

> **Importante**: El seed debe ejecutarse **antes** del build de produccion, ya que requiere que los archivos de configuracion TypeScript esten disponibles. En desarrollo (`pnpm dev`) funciona directamente. En un entorno de produccion compilado, ver la seccion [Seed en produccion](#seed-en-produccion).

```bash
# Detener Strapi, eliminar BD y resembrar (entorno desarrollo)
rm -f .tmp/data.db
node schemas/src/seed.js
pnpm dev
```

---

## Variables de entorno

Crear un archivo `.env` en la raiz del proyecto basado en `.env.example`.

### Tabla completa de variables

| Variable | Obligatorio | Desarrollo | Produccion | Generacion | Donde se usa | Notas |
|---|---|---|---|---|---|---|
| `HOST` | Si | `0.0.0.0` | `0.0.0.0` | Manual | `config/server.ts` | IP de escucha del servidor |
| `PORT` | Si | `1337` | `1337` | Manual | `config/server.ts` | Puerto interno |
| `APP_KEYS` | Si | `dev1,dev2,dev3,dev4` | 4+ claves unicas | `openssl rand -base64 32` (x4) | `config/server.ts` | Separadas por coma. Para sesiones |
| `API_TOKEN_SALT` | Si | `dev-salt` | Unico | `openssl rand -base64 32` | `config/admin.ts` | Para generar API tokens |
| `ADMIN_JWT_SECRET` | Si | `dev-secret` | Unico | `openssl rand -base64 32` | `config/admin.ts` | Firma JWT del panel admin |
| `TRANSFER_TOKEN_SALT` | Si | `dev-salt` | Unico | `openssl rand -base64 32` | `config/admin.ts` | Para transfer tokens |
| `JWT_SECRET` | Si | `dev-secret` | Unico | `openssl rand -base64 32` | Plugin users-permissions | **No es lo mismo que ADMIN_JWT_SECRET**. Usado para auth de usuarios finales |
| `ENCRYPTION_KEY` | Si | `dev-key` | Unico | `openssl rand -base64 32` | `config/admin.ts` | Cifrado de datos sensibles |
| `DATABASE_CLIENT` | Si | `sqlite` | `sqlite` o `postgres` | Manual | `config/database.ts` | Valores: `sqlite`, `postgres`, `mysql` |
| `DATABASE_FILENAME` | Condicional | `.tmp/data.db` | `.tmp/data.db` | Manual | `config/database.ts` | Solo cuando `DATABASE_CLIENT=sqlite` |
| `DATABASE_HOST` | Condicional | — | `localhost` | Manual | `config/database.ts` | Solo PostgreSQL/MySQL |
| `DATABASE_PORT` | Condicional | — | `5432` | Manual | `config/database.ts` | `5432` Postgres, `3306` MySQL |
| `DATABASE_NAME` | Condicional | — | `strapi_sga` | Manual | `config/database.ts` | Solo PostgreSQL/MySQL |
| `DATABASE_USERNAME` | Condicional | — | `strapi` | Manual | `config/database.ts` | Solo PostgreSQL/MySQL |
| `DATABASE_PASSWORD` | Condicional | — | `password_segura` | Manual | `config/database.ts` | Solo PostgreSQL/MySQL |
| `DATABASE_URL` | No | — | `postgres://...` | Manual | `config/database.ts` | Cadena alternativa a parametros individuales |
| `DATABASE_SSL` | No | `false` | `true` | Manual | `config/database.ts` | Habilita conexion SSL |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | No | `false` | `true` | Manual | `config/database.ts` | Rechazar certificados no verificados |
| `DATABASE_SCHEMA` | No | `public` | `public` | Manual | `config/database.ts` | Solo PostgreSQL |
| `DATABASE_CONNECTION_TIMEOUT` | No | `60000` | `60000` | Manual | `config/database.ts` | Timeout en milisegundos |
| `DATABASE_POOL_MIN` | No | `2` | `2` | Manual | `config/database.ts` | Conexiones minimas del pool |
| `DATABASE_POOL_MAX` | No | `10` | `10` | Manual | `config/database.ts` | Conexiones maximas del pool |
| `DATABASE_SSL_KEY` | No | — | — | Manual | `config/database.ts` | Clave privada SSL cliente |
| `DATABASE_SSL_CERT` | No | — | — | Manual | `config/database.ts` | Certificado SSL cliente |
| `DATABASE_SSL_CA` | No | — | — | Manual | `config/database.ts` | CA SSL |
| `FLAG_NPS` | No | `true` | `true` | Manual | `config/admin.ts` | Feature flag NPS |
| `FLAG_PROMOTE_EE` | No | `true` | `true` | Manual | `config/admin.ts` | Feature flag Enterprise |
| `FLAG_DOC_LINKS` | No | `true` | `true` | Manual | `config/admin.ts` | Feature flag doc links |

### Generacion de secretos

```bash
# Un solo secreto
openssl rand -base64 32

# Las 4 APP_KEYS de una vez (separadas por coma)
for i in 1 2 3 4; do openssl rand -base64 32; done | paste -sd ','

# Script completo para .env de produccion
cat <<ENV > .env
HOST=0.0.0.0
PORT=1337
APP_KEYS=$(for i in 1 2 3 4; do openssl rand -base64 32; done | paste -sd ',')
API_TOKEN_SALT=$(openssl rand -base64 32)
ADMIN_JWT_SECRET=$(openssl rand -base64 32)
TRANSFER_TOKEN_SALT=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
ENV
```

> **Importante**: Cada despliegue debe tener secretos unicos. No reutilizar los de desarrollo en produccion. No comitear el archivo `.env`.

---

## Comandos

| Comando | Descripcion |
|---------|-------------|
| `pnpm dev` | Inicia en modo desarrollo con hot-reload (`strapi develop`) |
| `pnpm build` | Compila TypeScript a `dist/` y construye el panel admin |
| `pnpm start` | Inicia en modo produccion (requiere `pnpm build` previo) |
| `pnpm console` | REPL interactivo de Strapi para depuracion |
| `pnpm strapi` | CLI generico de Strapi (`pnpm strapi --help`) |
| `pnpm upgrade` | Actualiza Strapi a la version mas reciente (`npx @strapi/upgrade latest`) |
| `pnpm upgrade:dry` | Simula la actualizacion sin aplicarla |

---

## Configuracion

### Servidor

Archivo: `config/server.ts`

```typescript
host: env('HOST', '0.0.0.0'),
port: env.int('PORT', 1337),
app: {
  keys: env.array('APP_KEYS'),
},
```

### Base de datos

Archivo: `config/database.ts`. Soporta tres motores:

#### SQLite (desarrollo por defecto)

```typescript
sqlite: {
  connection: {
    filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
  },
  useNullAsDefault: true,
},
```

Archivo de BD: `backend-strapi/.tmp/data.db` (ignorado por git).

#### PostgreSQL (produccion recomendada)

```typescript
postgres: {
  connection: {
    connectionString: env('DATABASE_URL'),
    host: env('DATABASE_HOST', 'localhost'),
    port: env.int('DATABASE_PORT', 5432),
    database: env('DATABASE_NAME', 'strapi'),
    user: env('DATABASE_USERNAME', 'strapi'),
    password: env('DATABASE_PASSWORD', 'strapi'),
    ssl: env.bool('DATABASE_SSL', false),
    schema: env('DATABASE_SCHEMA', 'public'),
  },
  pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
},
```

#### MySQL

Estructura similar a PostgreSQL, sin soporte de `schema`.

### CORS

Archivo: `config/middlewares.ts`

```typescript
{
  name: 'strapi::cors',
  config: {
    origin: ['http://localhost:3000'], // URL del frontend en desarrollo
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    keepHeaderOnError: true,
  },
},
```

En produccion, reemplazar `http://localhost:3000` por la URL real del frontend (ej: `https://app.dominio.com`).

### Panel de administracion

Archivo: `config/admin.ts`

| Propiedad | Variable de entorno |
|-----------|-------------------|
| `auth.secret` | `ADMIN_JWT_SECRET` |
| `apiToken.salt` | `API_TOKEN_SALT` |
| `transfer.token.salt` | `TRANSFER_TOKEN_SALT` |
| `secrets.encryptionKey` | `ENCRYPTION_KEY` |

URL del panel: `http://localhost:1337/admin` (se crea el primer admin en la primera ejecucion).

### API Config

Archivo: `config/api.ts`

```typescript
rest: {
  defaultLimit: 25,
  maxLimit: 100,
  withCount: true,
},
```

---

## Content Types

El sistema tiene **8 content types personalizados** desplegados, mas la **extension del plugin users-permissions**.

### Diagrama entidad-relacion

```mermaid
erDiagram
    FORM_TYPE ||--o{ FORM_TEMPLATE_VERSION : "tiene"
    FORM_TYPE ||--o{ FORMAT_MANAGER : "instancia"
    FORM_TEMPLATE_VERSION ||--o{ FORMAT_MANAGER : "versiona"
    FORM_TEMPLATE_VERSION }o--o{ FORM_SECTION : "contiene"
    FORM_SECTION }o--o{ FORM_FIELD : "tiene"
    FORM_SECTION ||--o{ SECTION_VALUE : "referencia"
    FORM_FIELD ||--o{ FIELD_VALUE : "define"
    FORMAT_MANAGER ||--o{ TEACHER_ENTRY : "agrupa"
    FORMAT_MANAGER ||--o{ SECTION_VALUE : "contiene"
    TEACHER_ENTRY ||--o{ FIELD_VALUE : "evalua"
    USER ||--o{ FORMAT_MANAGER : "crea"
```

### Tabla de content types

| # | Content Type | Coleccion API | draftAndPublish | Proposito |
|---|-------------|---------------|:-|-----------|
| 1 | `form-type` | `/api/form-types` | No | Categoria de formulario (Inicial, Seguimiento, Visita, Final) |
| 2 | `form-template-version` | `/api/form-template-versions` | No | Version de plantilla con flag activo |
| 3 | `form-section` | `/api/form-sections` | No | Seccion dentro de una plantilla |
| 4 | `form-field` | `/api/form-fields` | No | Campo dinamico dentro de una seccion |
| 5 | `format-manager` | `/api/format-managers` | **Si** | Instancia de informe (area, carrera, status, fechas) |
| 6 | `teacher-entry` | `/api/teacher-entries` | No | Fila de docente dentro de un informe |
| 7 | `field-value` | `/api/field-values` | No | Valor EAV por docente + campo |
| 8 | `section-value` | `/api/section-values` | **Si** | Valor de texto libre por seccion |

### Detalle de atributos

#### form-type
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `label_type` | string | Nombre visible (ej: "Informe Inicial") |
| `type` | uid | Identificador unico (ej: "informe-inicial") |
| `description` | text | Descripcion del tipo de formulario |

#### form-template-version
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `label_template_version` | string | Nombre visible (ej: "Periodo 68") |
| `template_version` | string | Version interna (ej: "periodo 68") |
| `active` | boolean | Indica si es la version activa |
| `form_type` | relation | M2O -> form-type |
| `form_sections` | relation | M2M -> form-section |

#### form-section
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `label_form_section` | string | Nombre visible |
| `form_section` | uid | Identificador slug |
| `order` | integer | Orden de aparicion |
| `section_type` | enum | `header_table`, `description_text`, `free_text`, `parameter_table`, `teacher_observation`, `signature` |
| `form_template_versions` | relation | M2M -> form-template-version |
| `form_fields` | relation | M2M -> form-field |
| `section_values` | relation | O2M -> section-value |

#### form-field
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `label_form_field` | string | Nombre visible del campo |
| `order` | integer | Orden dentro de la seccion |
| `field_type` | enum | `select`, `rating`, `textarea`, `text` |
| `options` | json | Opciones (para select) |
| `required` | boolean | Campo obligatorio |
| `group` | string | Agrupacion (SB, VA, etc.) |
| `render_as` | enum | `grid_cell`, `observation_block` |
| `form_sections` | relation | M2M -> form-section |
| `field_values` | relation | O2M -> field-value |

#### format-manager
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `area` | string | Area o departamento |
| `career` | string | Carrera |
| `status_form` | enum | `draft`, `completed`, `archived` |
| `report_date` | date | Fecha del informe |
| `form_type` | relation | M2O -> form-type |
| `form_template_version` | relation | M2O -> form-template-version |
| `user` | relation | M2O -> user (plugin) |
| `teacher_entries` | relation | O2M -> teacher-entry |
| `section_values` | relation | O2M -> section-value |

#### teacher-entry
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `teacher_name` | string | Nombre del docente |
| `subject` | string | Asignatura |
| `group` | string | Grupo/paralelo |
| `cycle` | string | Ciclo/nivel |
| `project` | string | Proyecto |
| `code` | string | Codigo |
| `format_manager` | relation | M2O -> format-manager |
| `field_values` | relation | O2M -> field-value |

#### field-value
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `value` | text | Valor del campo |
| `form_field` | relation | M2O -> form-field |
| `teacher_entry` | relation | M2O -> teacher-entry |

#### section-value
| Atributo | Tipo | Descripcion |
|----------|------|-------------|
| `value` | text | Contenido de texto libre |
| `form_section` | relation | M2O -> form-section |
| `format_manager` | relation | M2O -> format-manager |

### Tipos de formulario seedados

| Tipo | Secciones | Campos parametricos | Observations |
|------|-----------|---------------------|--------------|
| Informe Inicial | 5 | — | 2 textareas |
| Informe de Seguimiento | 8 | 11 (SB) | 2 textareas |
| Informe de Seguimiento con Visita | 8 | 6 (VA) | 5 textareas |
| Informe Final | 8 | 4 (VA Final) | 4 textareas |

### Tipos de seccion

| Tipo | Descripcion |
|------|-------------|
| `header_table` | Tabla con metadatos del informe (tipo, periodo, jefe, area, carrera, fecha) |
| `description_text` | Texto descriptivo de solo lectura |
| `free_text` | Textarea libre para que el usuario complete |
| `parameter_table` | Tabla de parametros con campos select/rating por docente |
| `teacher_observation` | Bloque de observaciones y acciones de mejora por docente |
| `signature` | Linea de firma centrada |

### Ciclo de vida del registro

```mermaid
stateDiagram-v2
    [*] --> draft : Jefe crea informe
    draft --> completed : Se completa el informe
    completed --> draft : Admin revierte a borrador
    draft --> archived : Admin archiva
    completed --> archived : Admin archiva
```

---

## Patron EAV

El sistema usa **Entity-Attribute-Value** para manejar formularios con estructura dinamica:

```
Definicion (FORM_FIELD):
  1. "SB: Silabo cargado en AVAC"  → tipo select, grupo SB, opciones [Si, No, Parcial]
  2. "VA: Asistencia y puntualidad" → tipo select, grupo VA, opciones [Si, No, Parcial]

Entidad (TEACHER_ENTRY):
  Docente: "Maria Lopez", Asignatura: "Programacion", Grupo: "A"

Valores (FIELD_VALUE):
  form_field=1, teacher_entry=X → "Si"
  form_field=2, teacher_entry=X → "No"
```

Las relaciones M:N (form-section <-> form-template-version, form-section <-> form-field) las gestiona Strapi internamente con tablas pivote automaticas. No existen content types puente en el backend desplegado.

---

## Endpoints de la API

### Endpoints de contenido (auto-generados)

| Verbo | Endpoint | Descripcion |
|-------|----------|-------------|
| GET/POST | `/api/form-types` | CRUD tipos de formulario |
| GET/POST | `/api/form-template-versions` | CRUD versiones de plantilla |
| GET/POST | `/api/form-sections` | CRUD secciones |
| GET/POST | `/api/form-fields` | CRUD campos |
| GET/POST | `/api/format-managers` | CRUD informes |
| GET/POST | `/api/teacher-entries` | CRUD docentes por informe |
| GET/POST | `/api/field-values` | CRUD valores EAV |
| GET/POST | `/api/section-values` | CRUD valores de seccion |

Cada endpoint soporta `GET/:id`, `PUT/:id`, `DELETE/:id`.

### Endpoints de autenticacion

| Verbo | Endpoint | Descripcion |
|-------|----------|-------------|
| POST | `/api/auth/local` | Login (identifier + password) -> `{ jwt, user }` |
| POST | `/api/auth/local/register` | Registro de usuarios (si esta habilitado) |
| GET | `/api/users/me` | Datos del usuario autenticado |
| GET | `/api/users` | Listar usuarios (admin) |
| POST | `/api/users` | Crear usuario (admin) |
| PUT | `/api/users/:id` | Actualizar usuario (admin) |
| DELETE | `/api/users/:id` | Eliminar usuario (admin) |

### Endpoints personalizados

| Verbo | Endpoint | Descripcion |
|-------|----------|-------------|
| GET | `/api/pdf/generate/:documentId` | Genera PDF de un informe |

### Consultas clave

**Obtener plantilla activa con secciones y campos:**
```
GET /api/form-template-versions
  ?filters[form_type][type][$eq]=informe-seguimiento
  &filters[active][$eq]=true
  &populate[form_sections][populate][form_fields]=*
```

**Listar informes para dashboard:**
```
GET /api/format-managers
  ?populate[form_template_version][populate][form_type]=true
  &populate[teacher_entries][fields][0]=id
  &populate[form_type]=true
  &populate[user]=true
  &sort[0]=createdAt:desc
```

**Ver detalle completo de un informe:**
```
GET /api/format-managers/{documentId}
  ?populate[form_template_version][populate][form_sections][populate][form_fields]=*
  &populate[teacher_entries][populate][field_values][populate][form_field]=true
  &populate[section_values][populate][form_section]=true
  &populate[form_type]=true
  &populate[user]=true
```

---

## Autenticacion y usuarios

### Schema de usuario extendido

El plugin `users-permissions` se extiende con campos personalizados en `src/extensions/users-permissions/content-types/user/schema.json`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `username` | string (unique, min 3) | Nombre de usuario |
| `email` | email (unique, min 6) | Correo electronico |
| `password` | password (private, min 6) | Contrasena |
| `confirmed` | boolean | Cuenta confirmada |
| `blocked` | boolean | Cuenta bloqueada |
| `role` | relation M2O | Rol de Strapi (authenticated, public) |
| `area` | string | Area o departamento del usuario |
| `role_type` | enum | `admin` o `jefe_area` |
| `format_managers` | relation O2M | Informes asignados al usuario |

### Roles del sistema

| Rol | Permisos |
|-----|----------|
| `admin` | CRUD usuarios, crear informes (wizard), archivar/revertir informes, acceso a `/usuarios` |
| `jefe_area` | Llenar informes asignados (draft -> completed), no puede crear usuarios ni informes nuevos |

### Flujo de autenticacion

1. El frontend envia `POST /api/auth/local` con `identifier` y `password`
2. Strapi valida las credenciales y devuelve `{ jwt, user }`
3. El frontend almacena el JWT en `localStorage('ups-jwt')` y el usuario en `localStorage('ups-session')`
4. Cada llamada a la API incluye `Authorization: Bearer <token>`
5. El campo `user.role_type` determina los permisos del usuario

### Creacion del administrador del sistema

#### Primer administrador (panel Strapi)

En la primera ejecucion del sistema, el panel de Strapi no tiene ningun administrador. Para crearlo:

1. Abrir `http://localhost:1337/admin` (o la URL del servidor en produccion)
2. Completar el formulario de registro con nombre, email y contrasena
3. Este usuario es super-admin de Strapi y tiene acceso total al panel `/admin`

Este paso solo es necesario una vez. No se puede realizar via API porque el sistema aun no tiene configuradas las claves de autenticacion.

#### Administradores de la aplicacion (usuarios con rol admin)

Los usuarios que administran el sistema desde el frontend (con `role_type = admin`) se crean mediante el endpoint de registro de la API y luego se cambia su rol:

**Paso 1: Crear el usuario via API**

```bash
curl -X POST http://localhost:1337/api/auth/local/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_principal",
    "email": "admin@ups.edu.ec",
    "password": "PasswordSegura123!",
    "area": "Jefatura de Sistemas",
    "role_type": "jefe_area"
  }'
```

> El registro asigna automaticamente el rol `authenticated` de Strapi y el `role_type` enviado en la solicitud. Por defecto se usa `jefe_area` para que el usuario pueda iniciar sesion, pero aun no tiene permisos de admin.

**Paso 2: Cambiar el rol a admin**

Desde el panel de Strapi (`/admin`):

1. Ir a **Content Manager → User** (o **Users** segun la configuracion)
2. Buscar el usuario creado
3. Cambiar el campo `role_type` de `jefe_area` a `admin`
4. Guardar

O alternativamente, via API (requiere autenticacion de un admin de Strapi):

```bash
# Obtener el ID del usuario
curl -X GET http://localhost:1337/api/users \
  -H "Authorization: Bearer <strapi_admin_token>"

# Actualizar el role_type
curl -X PUT http://localhost:1337/api/users/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <strapi_admin_token>" \
  -d '{
    "role_type": "admin"
  }'
```

> **Nota**: El usuario creado via `register` tiene `confirmed: false` por defecto. Para habilitar confirmacion automatica, configurar en el panel Strapi: **Settings → Advanced → Enable signup** y opcionalmente deshabilitar el envio de email de confirmacion en entornos controlados.

---

## Generacion de PDF

El backend genera PDFs de los informes a traves del endpoint `GET /api/pdf/generate/:documentId`.

### Arquitectura

```
src/api/pdf/
  controllers/pdf.ts       # Controlador del endpoint
  routes/pdf.ts            # Ruta (requiere autenticacion)
  services/
    pdf.ts                 # Orquestador principal
    inicial.ts             # Plantilla PDF para Informe Inicial
    seguimiento.ts         # Plantilla PDF para Informe de Seguimiento
    seguimiento-visita.ts  # Plantilla PDF para Visita Aulica
    final.ts               # Plantilla PDF para Informe Final
    utils.ts               # Tema, formato, funciones compartidas (604 lineas)
```

### Libreria

Se utiliza **pdfmake** (`^0.3.11`), una libreria de generacion de PDFs del lado del servidor. El servicio orquestador (`pdf.ts`) recibe el `documentId`, obtiene todos los datos del informe con sus relaciones, determina el tipo de formulario, delega en el servicio correspondiente y devuelve el PDF generado.

---

## Seed de datos iniciales

El script de seed se encuentra en `schemas/src/seed.js`.

### Que crea

- 4 tipos de formulario: Inicial, Seguimiento, Visita, Final
- 1 version de plantilla activa por tipo ("Periodo 68")
- Secciones completas para cada tipo (5 a 8 secciones)
- Campos parametricos (select con opciones Si/No/Parcial) y campos de observacion (textarea)
- Relaciones entre secciones, campos y versiones de plantilla

### Como ejecutar

```bash
# Desde la raiz del proyecto (entorno desarrollo)
rm -f backend-strapi/.tmp/data.db
node schemas/src/seed.js
```

> **Advertencia**: Esto elimina todos los datos existentes en la base de datos.

### Seed en produccion

El seed usa `createStrapi()` para conectarse a la base de datos, pero Node.js no puede cargar directamente archivos de configuracion TypeScript (`.ts`). En un entorno compilado para produccion se requieren dos pasos adicionales:

```bash
# 1. Copiar configuraciones compiladas (necesario solo la primera vez)
cp dist/config/*.js config/

# 2. Instalar tsx para ejecutar TypeScript
pnpm add -D tsx

# 3. Ejecutar seed
rm -f .tmp/data.db
npx tsx schemas/src/seed.js

# 4. Limpiar archivos temporales (opcional, los .js en config/ se ignoran en produccion)
# rm config/admin.js config/api.js config/database.js config/middlewares.js config/plugins.js config/server.js
```

> **Alternativa recomendada**: Ejecutar el seed **antes** del build de produccion, en un entorno de desarrollo, y luego copiar la base de datos resultante al servidor de produccion. Esto evita la dependencia de `tsx` y la copia de configuraciones.

---

## Migracion de datos desde pruebas a produccion

Cuando el sistema ha sido utilizado en un entorno de pruebas con datos reales y se necesita migrar esa informacion a produccion, existen tres estrategias:

### Opcion 1: Strapi Transfer (recomendada)

Strapi 5 incluye la herramienta `strapi transfer` que permite migrar datos entre instancias directamente:

```bash
# En la instancia de PRODUCCION (destino), ejecutar:
cd /var/www/sga/backend-strapi
pnpm strapi transfer --from <url_de_pruebas> --force

# Ejemplo con autenticacion:
pnpm strapi transfer --from https://admin:password@pruebas.dominio.com/admin --force
```

> Requiere que ambas instancias tengan configurado `TRANSFER_TOKEN_SALT` y un transfer token generado en la instancia de origen (Settings → Transfer Tokens → Create).

**Ventajas**: Migra toda la base de datos (content types, relaciones, archivos, usuarios, configuraciones). Rapido y automatico.

**Desventajas**: Requiere que ambas instancias esten en linea. La version de Strapi debe ser la misma en ambos entornos.

### Opcion 2: Exportacion manual con dump SQL (base de datos)

Si ambos entornos usan SQLite:

```bash
# 1. Detener Strapi en pruebas
pm2 stop strapi   # o Ctrl+C si es dev

# 2. Copiar la base de datos
cp /ruta/pruebas/backend-strapi/.tmp/data.db /tmp/data_pruebas.db

# 3. Enviar a produccion
scp /tmp/data_pruebas.db usuario@produccion:/tmp/

# 4. En produccion, reemplazar la base de datos
cd /var/www/sga/backend-strapi
pm2 stop strapi
cp /tmp/data_pruebas.db .tmp/data.db
pm2 start strapi
```

Si los entornos usan distinto motor de BD (SQLite en pruebas, PostgreSQL en produccion):

```bash
# 1. Exportar desde SQLite
cd /ruta/pruebas/backend-strapi
sqlite3 .tmp/data.db .dump > /tmp/dump_pruebas.sql

# 2. Convertir el dump para PostgreSQL (requiere ajustes manuales)
# - Reemplazar AUTOINCREMENT por SERIAL
# - Reemplazar comillas dobles por comillas simples donde corresponda
# - Ajustar tipos de datos (INTEGER → INT, TEXT → VARCHAR)

# 3. Importar en PostgreSQL
sudo -u postgres psql strapi_sga < /tmp/dump_pruebas.sql

# 4. Reconstruir Strapi
NODE_ENV=production pnpm build
pm2 restart strapi
```

> **Advertencia**: El dump SQL directo entre motores requiere revision manual de las diferencias de sintaxis. No es un proceso automatico.

### Opcion 3: Migracion selectiva via API (solo contenido)

Para migrar unicamente los tipos de formulario, secciones y campos (sin datos de informes ni usuarios), se puede usar el script de seed adaptado con los datos de pruebas:

1. Conectarse al panel de Strapi de pruebas (`/admin`)
2. Exportar manualmente cada content type a JSON desde **Content Manager**
3. Importar esos JSON en produccion mediante el panel o via API

```bash
# Ejemplo: exportar form-types desde pruebas
curl -X GET http://localhost:1337/api/form-types \
  -H "Authorization: Bearer <token_pruebas>" > form-types.json

# Importar en produccion
curl -X POST http://localhost:1337/api/form-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_produccion>" \
  -d @form-types.json
```

> **Nota**: Este metodo preserva los IDs de Strapi. Si se requiere regenerar IDs, omitir el campo `id` en la importacion.

### Recomendaciones

| Escenario | Estrategia |
|-----------|------------|
| Pruebas → Produccion con misma version de Strapi | Transfer (Opcion 1) |
| SQLite → SQLite, servidores aislados | Dump manual (Opcion 2) |
| SQLite → PostgreSQL, misma maquina | Dump + conversion manual (Opcion 2) |
| Solo migrar plantillas de formulario | API selectiva (Opcion 3) |
| Migrar todo (datos + config + usuarios) | Transfer (Opcion 1) |

### Pasos post-migracion

1. Verificar que los usuarios existen y tienen los roles correctos
2. Revisar que las relaciones entre content types esten intactas
3. Probar la generacion de PDF con un informe existente
4. Verificar que el frontend pueda cargar los informes migrados
5. Ejecutar el seed si se necesita resetear las plantillas:

```bash
cd /var/www/sga/backend-strapi
rm -f .tmp/data.db
node schemas/src/seed.js
pnpm build
pm2 restart strapi
```

---

## Guia de construccion de formularios

Documentacion completa para administradores sobre como se estructuran y crean los formularios en el sistema.

### Conceptos clave

Los formularios se construyen con 4 bloques jerarquicos:

```
TIPO DE FORMULARIO (form-type)
└── VERSION DE PLANTILLA (form-template-version) — una activa por tipo
    ├── SECCION (form-section) — agrupa campos relacionados
    │   ├── CAMPO (form-field) — tipo select, rating, textarea o text
    │   └── CAMPO ...
    └── SECCION ...
```

### Que crea el seed

| Tipo | Secciones | Campos parametricos | Observaciones |
|------|-----------|---------------------|---------------|
| Informe Inicial | 5 | — | Texto libre |
| Informe de Seguimiento | 8 | 11 (SB) | 2 textarea |
| Informe de Seguimiento con Visita | 8 | 6 (VA) | 5 textarea |
| Informe Final | 8 | 4 (VA Final) | 4 textarea |

### Tipos de seccion

| Tipo | Comportamiento |
|------|----------------|
| `header_table` | Tabla de metadatos (solo lectura). Siempre al inicio (order: 0) |
| `free_text` | Textarea libre para completar |
| `description_text` | Texto informativo de solo lectura |
| `parameter_table` | Tabla de parametros por docente (select/rating) |
| `teacher_observation` | Bloque de observaciones por docente (textarea) |
| `signature` | Linea de firma centrada. Siempre al final (order: 99) |

### Tipos de campo

| Tipo | Renderizado | Uso |
|------|-------------|-----|
| `select` | Control segmentado (Si/No/Parcial) | Evaluaciones con opciones fijas |
| `rating` | Calificacion numerica | Escalas de valoracion |
| `textarea` | Area de texto multilinea | Observaciones y analisis |
| `text` | Campo de texto simple | Informacion corta |

### Como crear un nuevo tipo de formulario

Desde el panel de administracion de Strapi (`/admin`):

1. **Crear el Tipo**: Content Manager → Form Type → New entry (`label_type`, `description`)
2. **Crear Secciones**: Content Manager → Form Section → New entry (`label_form_section`, `order`, `section_type`)
3. **Crear Campos** (si aplica): Content Manager → Form Field → New entry (`label_form_field`, `field_type`, `options`)
4. **Asignar Campos a Secciones**: Editar cada seccion y conectar los campos en `form_fields`
5. **Crear Version de Plantilla**: Content Manager → Form Template Version → New entry (`label_template_version`, `active: true`, `form_type`, `form_sections`)
6. **Verificar en el Frontend**: Aparecera en el paso 1 del wizard de nuevo informe

### Reglas importantes

- Solo una version activa por tipo de formulario a la vez
- La seccion `header_table` debe tener `order: 0` y `signature` debe tener `order: 99`
- Las opciones de select se definen como JSON: `["Si", "No", "Parcial"]`
- Los cambios en la plantilla solo afectan a informes nuevos, no a los existentes

### Detalle de formularios seedados

#### Informe Inicial

| Seccion | Tipo | Orden | Campos |
|---------|------|-------|--------|
| Informacion General | `header_table` | 0 | (metadatos automaticos) |
| Antecedentes | `free_text` | 1 | Ninguno (texto libre) |
| Actividades | `free_text` | 2 | Ninguno (texto libre) |
| Analisis de la Jefatura de Area | `free_text` | 3 | Ninguno (texto libre) |
| Firma | `signature` | 99 | Ninguno (solo visual) |

#### Informe de Seguimiento

| Seccion | Tipo | Orden | Campos |
|---------|------|-------|--------|
| Informacion General | `header_table` | 0 | (metadatos automaticos) |
| Antecedentes | `free_text` | 1 | Ninguno (texto libre) |
| Objetivos | `free_text` | 2 | Ninguno (texto libre) |
| Detalle | `description_text` | 3 | Ninguno (solo lectura) |
| Parametros SB | `parameter_table` | 4 | 11 campos select (SB) |
| Observaciones y Acciones | `teacher_observation` | 5 | 2 campos textarea |
| Analisis del seguimiento realizado y acciones generales de mejora | `free_text` | 6 | Ninguno (texto libre) |
| Firma | `signature` | 99 | Ninguno (solo visual) |

**Campos parametricos SB:**
1. SB: Silabo cargado en AVAC
2. SB: Registro de avance del silabo
3. SB: Guia del Componente de Practicas de Aplicacion y Experimentacion de los Aprendizajes
4. Enlace de la consejeria academica
5. Recursos y /o Material con derechos de autor
6. Enlaces a libros digitales de la biblioteca de la Universidad como textos complementarios
7. Seccion "PRACTICAS"
8. Guias de cada componente practico o tarea
9. Actividades calificadas (evaluaciones, trabajos, foros, etc) con rubrica
10. Seccion "ACTIVIDADES INVESTIGATIVAS"
11. Actividad para fomentar participacion de estudiantes en la investigacion

#### Informe de Visita Aulica

| Seccion | Tipo | Orden | Campos |
|---------|------|-------|--------|
| Informacion General | `header_table` | 0 | (metadatos automaticos) |
| Antecedentes | `free_text` | 1 | Ninguno (texto libre) |
| Objetivos | `free_text` | 2 | Ninguno (texto libre) |
| Detalle | `description_text` | 3 | Ninguno (solo lectura) |
| Parametros VA | `parameter_table` | 4 | 6 campos select (VA) |
| Observaciones y Analisis | `teacher_observation` | 5 | 5 campos textarea |
| Analisis del seguimiento realizado y acciones generales de mejora | `free_text` | 6 | Ninguno (texto libre) |
| Firma | `signature` | 99 | Ninguno (solo visual) |

**Campos parametricos VA:**
1. Visita aulica (VA)
2. VA: Asistencia y puntualidad del docente
3. VA: Revision del cumplimiento del contenido del silabo
4. VA: Cumplimiento de las practicas planteadas
5. VA: Actividades calificadas (evaluaciones, trabajos, foros, etc.) con rubrica
6. VA: Actividad para fomentar participacion de estudiantes en la investigacion

#### Informe Final

| Seccion | Tipo | Orden | Campos |
|---------|------|-------|--------|
| Informacion General | `header_table` | 0 | (metadatos automaticos) |
| Antecedentes | `free_text` | 1 | Ninguno (texto libre) |
| Objetivos | `free_text` | 2 | Ninguno (texto libre) |
| Detalle | `description_text` | 3 | Ninguno (solo lectura) |
| Parametros VA (Final) | `parameter_table` | 4 | 4 campos select (VA) |
| Observaciones y Analisis Final | `teacher_observation` | 5 | 4 campos textarea |
| Analisis del seguimiento realizado y acciones generales de mejora | `free_text` | 6 | Ninguno (texto libre) |
| Firma | `signature` | 99 | Ninguno (solo visual) |

**Campos parametricos VA Final:**
1. VA: Revision del cumplimiento del contenido del silabo
2. VA: Asistencia y puntualidad del docente
3. VA: Cumplimiento de las practicas planteadas
4. VA: Actividades calificadas (evaluaciones, trabajos, foros, etc) con rubrica

---

## Estructura del proyecto

```
backend-strapi/
├── config/
│   ├── admin.ts          # Config panel admin (secretos, flags)
│   ├── api.ts            # Config REST (defaultLimit, maxLimit)
│   ├── database.ts       # Conexion BD (SQLite, Postgres, MySQL)
│   ├── middlewares.ts    # CORS, logger, security, body parser
│   ├── plugins.ts        # Plugins habilitados (vacio)
│   └── server.ts         # Host, puerto, app keys
├── database/
│   └── migrations/       # Migraciones personalizadas (vacio)
├── dist/                 # Compilado TypeScript (generado)
├── public/
│   └── uploads/          # Archivos subidos (ignorado por git)
├── src/
│   ├── index.ts          # Bootstrap (register + bootstrap vacios)
│   ├── api/              # 8 content types + PDF
│   │   ├── form-type/
│   │   ├── form-template-version/
│   │   ├── form-section/
│   │   ├── form-field/
│   │   ├── format-manager/
│   │   ├── teacher-entry/
│   │   ├── field-value/
│   │   ├── section-value/
│   │   └── pdf/
│   │       ├── controllers/pdf.ts
│   │       ├── routes/pdf.ts
│   │       └── services/ (pdf.ts, inicial.ts, seguimiento.ts, ...)
│   └── extensions/
│       └── users-permissions/
│           └── content-types/user/schema.json
├── types/
│   └── generated/        # Tipos autogenerados por Strapi
├── .env                  # Variables de entorno (NO comitear)
├── .env.example          # Plantilla de variables
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## Despliegue a produccion

### Software requerido en el servidor

| Software | Version |
|----------|---------|
| Node.js | 22 LTS |
| pnpm | 9+ |
| Nginx | 1.24+ |
| PM2 | 5+ |
| Certbot | 2+ (para SSL) |
| Certbot | 2+ (para SSL) |

### Pasos

```bash
# 1. Clonar en el servidor
sudo mkdir -p /var/www/sga
sudo chown $USER:$USER /var/www/sga
cd /var/www/sga
git clone <repo-url> .

# 2. (Solo pnpm >= 11) Verificar compatibilidad del workspace
# El archivo pnpm-workspace.yaml debe usar el formato "onlyBuiltDependencies"
# (no "allowBuilds", que es obsoleto en pnpm 11+)
# Ver seccion "Compatibilidad con pnpm 11" abajo si hay errores.

# 3. Instalar dependencias
cd backend-strapi
pnpm install --frozen-lockfile

# 4. Aprobar builds de dependencias nativas (solo primera vez con pnpm 11+)
pnpm approve-builds @swc/core better-sqlite3 core-js-pure esbuild sharp

# 5. Configurar .env con secretos unicos para produccion
cp .env.example .env
nano .env

# 6. Configurar CORS para el dominio del frontend
# Editar config/middlewares.ts: origin: ['https://app.dominio.com']

# 7. Compilar
NODE_ENV=production pnpm build

# 8. Iniciar con PM2
pm2 start npm --name "strapi" -- run start
pm2 save
pm2 startup  # Ejecutar el comando que muestra
```

### Notas sobre el orden de compilacion

- El seed debe ejecutarse **antes** del build de produccion (o usando `tsx`). Ver [Seed en produccion](#seed-en-produccion).
- El comando `pnpm develop` limpia el directorio `dist/`. Si se uso en desarrollo, se debe recompilar con `NODE_ENV=production pnpm build` antes de iniciar en produccion.

### Compatibilidad con pnpm 11+

pnpm 11 introdujo cambios en la configuracion de builds aprobados. Si al ejecutar `pnpm install` aparece el error:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: ...
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

Ejecutar:

```bash
pnpm approve-builds @swc/core better-sqlite3 core-js-pure esbuild sharp
```

Y asegurar que `pnpm-workspace.yaml` use el formato moderno:

```yaml
onlyBuiltDependencies:
  - '@swc/core'
  - better-sqlite3
  - core-js-pure
  - esbuild
  - sharp
```

El campo `pnpm.onlyBuildDependencies` en `package.json` y el campo `allowBuilds` en `pnpm-workspace.yaml` son **obsoletos** en pnpm 11, ignorados silenciosamente, lo que causa que el build falle.

### Configuracion de Nginx

```nginx
server {
    listen 80;
    server_name api.dominio.com;

    client_max_body_size 10M;

    location /uploads/ {
        alias /var/www/sga/backend-strapi/public/uploads/;
        expires max;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL con Certbot

```bash
sudo certbot --nginx -d api.dominio.com
```

### Verificar

```bash
curl http://localhost:1337/_health
curl https://api.dominio.com/_health
```

---

## Base de datos: migracion a PostgreSQL

### Por que migrar

SQLite funciona bien para desarrollo y cargas bajas, pero PostgreSQL es recomendado para produccion por su concurrencia, rendimiento y seguridad.

### Pasos

1. **Dump de SQLite**:
   ```bash
   sqlite3 .tmp/data.db .dump > dump.sql
   ```

2. **Configurar PostgreSQL**:
   ```bash
   # Crear base de datos
   sudo -u postgres createdb strapi_sga
   sudo -u postgres psql -c "CREATE USER strapi WITH PASSWORD 'password_segura';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE strapi_sga TO strapi;"
   ```

3. **Actualizar .env**:
   ```ini
   DATABASE_CLIENT=postgres
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=strapi_sga
   DATABASE_USERNAME=strapi
   DATABASE_PASSWORD=password_segura
   DATABASE_SSL=true
   DATABASE_SSL_REJECT_UNAUTHORIZED=true
   DATABASE_SCHEMA=public
   ```

4. **Reconstruir e iniciar**:
   ```bash
   NODE_ENV=production pnpm build
   pm2 restart strapi
   ```

> Alternativa: usar `pnpm strapi transfer` para migrar datos entre bases de datos.

---

## Respaldos

### Respaldo manual de SQLite

```bash
cp .tmp/data.db /ruta/de/respaldo/data_$(date +%Y%m%d).db
gzip /ruta/de/respaldo/data_$(date +%Y%m%d).db
```

### Script de respaldo completo

```bash
#!/bin/bash
# /usr/local/bin/backup-sga.sh
BACKUP_DIR="/var/backups/sga"
DATE=$(date +%Y%m%d_%H%M%S)
SGA_DIR="/var/www/sga"

mkdir -p "$BACKUP_DIR"

# Base de datos
cp "$SGA_DIR/backend-strapi/.tmp/data.db" "$BACKUP_DIR/data_$DATE.db"

# Uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$SGA_DIR/backend-strapi/public" uploads/

# Variables de entorno
cp "$SGA_DIR/backend-strapi/.env" "$BACKUP_DIR/env_backend_$DATE.txt"

# Limpiar backups mayores a 30 dias
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

Programar en cron:
```bash
sudo crontab -e
0 3 * * * /usr/local/bin/backup-sga.sh
```

### Restauracion

```bash
pm2 stop strapi
cp /var/backups/sga/data_20241201.db .tmp/data.db
pm2 start strapi
```

---

## Mantenimiento y actualizaciones

### Actualizar Strapi

```bash
pm2 stop strapi
cp .tmp/data.db /tmp/pre-upgrade-data.db  # Respaldo preventivo
pnpm upgrade
NODE_ENV=production pnpm build
pm2 start strapi
```

### Logs

```bash
pm2 logs strapi          # Logs en tiempo real
pm2 logs strapi --lines 100  # Ultimas 100 lineas
pm2 monit                # Monitoreo de procesos
```

---

## Solucion de problemas

### Strapi no inicia
- Revisar logs: `pm2 logs strapi`
- Verificar que `.env` tenga todos los secretos configurados
- Asegurar que el puerto 1337 no este ocupado: `ss -tlnp | grep 1337`
- Verificar permisos del directorio `.tmp/`: `chmod -R 755 .tmp`

### Error de permisos en SQLite
```bash
chown -R $USER:$USER .tmp
chmod -R 755 .tmp
```

### Base de datos corrupta o bloqueada
```bash
# Verificar que solo haya un proceso Strapi
pm2 list

# Restaurar desde backup
pm2 stop strapi
cp /backups/data_reciente.db .tmp/data.db
pm2 start strapi
```

### Error 502 en produccion
- CORS mal configurado: verificar `config/middlewares.ts`
- Strapi no esta corriendo: `pm2 list`, `pm2 start strapi`
- Puerto incorrecto en el proxy de Nginx

### Seed falla
- Verificar que el archivo `.env` existe y tiene las variables requeridas
- Strapi debe poder conectarse a la base de datos
- Eliminar la BD y reintentar: `rm -f .tmp/data.db && node schemas/src/seed.js`
