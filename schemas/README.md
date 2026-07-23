# Strapi Schemas — Referencia de Diseño

Schemas de content types y seed script para el sistema de formularios dinámicos de Jefatura de Área.

> **Nota:** Estos schemas son el **diseño de referencia**. Los schemas desplegados en `backend-strapi/src/api/` tienen diferencias (ver sección Diferencias más abajo). El `seed.js` está adaptado para ejecutarse contra la base de datos de `backend-strapi/`.

## Estructura

```
strapi-schemas/
├── DIAGRAM.md            # Diagrama relacional del backend desplegado
├── README.md
└── src/
    ├── seed.js           # Script que puebla backend-strapi/.tmp/data.db
    └── api/
        ├── form-type/             # Categoría de informe
        ├── form-template-version/ # Versión por período lectivo
        ├── form-section/          # Secciones del formulario
        ├── form-field/            # Campos dinámicos (EAV)
        ├── form-section-version/  # [Puente N:N explícito]
        ├── form-field-section/    # [Puente N:N explícito]
        ├── format-manager/        # Instancia de informe
        ├── section-value/         # Texto libre por sección
        ├── teacher-entry/         # Fila docente/asignatura
        └── field-value/           # Valor EAV
    └── extensions/
        └── users-permissions/     # Extensión de user
```

## Content Types (10 de referencia)

| # | Entidad | Colección | Propósito |
|---|---------|-----------|-----------|
| 1 | `form-type` | `form_types` | Categoría de formulario |
| 2 | `form-template-version` | `form_template_versions` | Versión de plantilla por período |
| 3 | `form-section` | `form_sections` | Sección reutilizable |
| 4 | `form-field` | `form_fields` | Campo/parámetro dinámico |
| 5 | `form-section-version` | `form_section_versions` | Puente N:N section ↔ template |
| 6 | `form-field-section` | `form_field_sections` | Puente N:N field ↔ section |
| 7 | `format-manager` | `format_managers` | Instancia de informe completado |
| 8 | `section-value` | `section_values` | Texto libre de una sección |
| 9 | `teacher-entry` | `teacher_entries` | Fila de datos del docente |
| 10 | `field-value` | `field_values` | Valor EAV (entidad-atributo-valor) |

## Seed

Puebla `backend-strapi/.tmp/data.db` con 4 tipos de informe, cada uno con su estructura.

El script es **portable**: se puede ejecutar desde cualquier directorio. Internamente usa `__dirname` para resolver la raíz del proyecto y `process.chdir()` + `appDir` para que Strapi cargue sus configuraciones correctamente.

```bash
# Desde cualquier ubicación
rm -f /ruta/a/backend-strapi/.tmp/data.db
npx tsx /ruta/a/backend-strapi/schemas/src/seed.js
```

### Lo que crea el seed

| Tipo | `label_type` | `type` | Secciones |
|------|-------------|--------|-----------|
| Informe Inicial | `Informe Inicial` | `informe-inicial` | 5 (info gral, antecedentes, actividades, análisis jefatura, firma) |
| Informe de Seguimiento | `Informe de Seguimiento` | `informe-seguimiento` | 8 (incluye Parámetros SB + Observaciones) |
| Informe Visita | `Informe de Seguimiento con Visita` | `informe-visita` | 8 (incluye Parámetros VA + Observaciones) |
| Informe Final | `Informe Final` | `informe-final` | 8 (incluye Parámetros VA Final + Observaciones) |

Todos los templates versionan con `template_version = "periodo 68"`, `label_template_version = "Período 68"`.

### Secciones por tipo de sección

| `section_type` | Uso |
|----------------|-----|
| `header_table` | Información General (tabla de datos fijos) |
| `free_text`    | Antecedentes, Objetivos, Análisis (WYSIWYG) |
| `description_text` | Detalle (texto informativo) |
| `parameter_table` | Parámetros SB/VA (grilla de campos select) |
| `teacher_observation` | Observaciones y Acciones (bloques textarea) |
| `signature` | Firma |

## Diferencias con el backend desplegado

El backend real (`backend-strapi/src/api/`) tiene **8** content types (no 10). Las diferencias principales:

| Aspecto | Schemas de referencia (`strapi-schemas/`) | Backend desplegado (`backend-strapi/`) |
|---------|------------------------------------------|----------------------------------------|
| Puentes N:N | `form-section-version` y `form-field-section` como C.T. explícitos | Strapi gestiona M:N internamente (tablas pivote automáticas) |
| Nombres field en form-type | `label_name`, `name`, `slug` (uid) | `label_type`, `type` (string) |
| Nombres field en template | `version_label`, `name`, `is_active` | `label_template_version`, `template_version`, `active` |
| Nombres field en section | `label_name`, `name` | `label_form_section`, `form_section` |
| Nombres field en field | `label_name`, `name` | `label_form_field` (sin `name`) |
| `format-manager.status` | `draft \| completed \| in_correction` | `draft \| completed \| archived` |
| `format-manager.period` | Existe (string, required) | No existe |
| `format-manager.jefe_area` | Existe (string) | No existe |
| `format-manager.user_id` | No existe | `integer` (redundante con la relation `user`) |
| `format-manager → form-type` | No existe | FK directa agregada |
| `field-value.needs_correction` | Existe (boolean) | No existe |
| `field-value.correction_comment` | Existe (text) | No existe |
| `section-value draftAndPublish` | `false` | `true` |
| `format-manager draftAndPublish` | `false` | `true` |
| User extension | `nombre`, `apellido`, `role_label`, `area`, `carrera`, `format_managers` | `area`, `role_type` (`admin`/`jefe_area`), `format_managers` |
| Controllers/Services | Schemas únicamente (sin código) | Factories Strapi con createCoreController/Router/Service |

## Relaciones (diseño de referencia)

```
form-type 1──N form-template-version
form-template-version 1──N form-section-version N──1 form-section
form-section 1──N form-field-section N──1 form-field
form-section 1──N section-value
form-field 1──N field-value
form-template-version 1──N format-manager
format-manager 1──N teacher-entry
teacher-entry 1──N field-value
format-manager 1──N section-value
user (plugin, role_type: admin|jefe_area) 1──N format-manager
```

## Consultas de ejemplo

### Obtener plantilla activa con secciones y campos (backend desplegado)

```
GET /api/form-template-versions
  ?filters[form_type][type][$eq]=informe-seguimiento
  &filters[active][$eq]=true
  &populate[form_sections][populate][form_fields]=*
```

### Listar informes para dashboard

```
GET /api/format-managers
  &populate[form_template_version][populate][form_type]=true
  &populate[teacher_entries][fields][0]=id
  &populate[form_type]=true
  &populate[user]=true
  &sort=createdAt:desc
```

### Ver detalle completo de un informe

```
GET /api/format-managers/{documentId}
  &populate[form_template_version][populate][form_sections][populate][form_fields]=*
  &populate[teacher_entries][populate][field_values][populate][form_field]=true
  &populate[section_values][populate][form_section]=true
  &populate[form_type]=true
  &populate[user]=true
```
