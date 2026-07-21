/**
 * Script de seed para Strapi 5
 * Pobla los 4 tipos de informe con su estructura inicial (v1).
 *
 * Uso:
 *   cd backend-strapi && node schemas/src/seed.js
 */

function toSlug(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .toLowerCase();
}

async function seed() {
  // Load .env manually (dotenv is a transitive pnpm dep, not directly accessible)
  const fs = require('fs');
  const envPath = require('path').resolve(__dirname, '../../.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }

  const { createStrapi } = require('@strapi/strapi');
  const strapi = createStrapi();
  await strapi.load();

  const db = strapi.db.query.bind(strapi.db);

  // ──── HELPERS ────

  const getParamsForType = (slug) => {
    const map = {
      'informe-inicial': [],
      'informe-seguimiento': [
        'SB: Sílabo cargado en AVAC',
        'SB: Registro de avance del sílabo',
        'SB: Guía del Componente de Prácticas de Aplicación y Experimentación de los Aprendizajes proveniente del sílabo',
        'Enlace de la consejería académica',
        'Recursos y /o Material con derechos de autor',
        'Enlaces a libros digitales de la biblioteca de la Universidad como textos complementarios',
        'Sección "PRÁCTICAS"',
        'Guías de cada componente práctico o tarea',
        'Actividades calificadas (evaluaciones, trabajos, foros, etc) con rúbrica',
        'Sección "ACTIVIDADES INVESTIGATIVAS"',
        'Actividad para fomentar participación de estudiantes en la investigación',
      ],
      'informe-visita': [
        'Visita áulica (VA)',
        'VA: Asistencia y puntualidad del docente',
        'VA: Revisión del cumplimiento del contenido del silabo (check marcado en el silabo y observaciones en la visita al aula)',
        'VA: Cumplimiento de las practicas planteadas.',
        'VA: Actividades calificadas (evaluaciones, trabajos, foros, etc.) con rúbrica',
        'VA: Actividad para fomentar participación de estudiantes en la investigación',
      ],
      'informe-final': [
        'VA: Revisión del cumplimiento del contenido del silabo (check marcado en el silabo y observaciones en la visita al aula)',
        'VA: Asistencia y puntualidad del docente',
        'VA: Cumplimiento de las practicas planteadas.',
        'VA: Actividades calificadas (evaluaciones, trabajos, foros, etc) con rúbrica',
      ],
    };
    return map[slug] || [];
  };

  const getObservationBlocksForType = (slug) => {
    const map = {
      'informe-inicial': [],
      'informe-seguimiento': [
        { label: 'Observaciones', order: 0 },
        { label: 'Acciones de Mejora', order: 1 },
      ],
      'informe-visita': [
        { label: 'VA: Observaciones de los estudiantes al docente', order: 0 },
        { label: 'Análisis de calificaciones', order: 1 },
        { label: 'Acciones de mejora sugeridas al docente, con base a las visitas áulicas y al análisis de calificaciones', order: 2 },
        { label: 'Observaciones del Docente a la Materia', order: 3 },
        { label: 'Acciones de Mejora del Docente a la materia', order: 4 },
      ],
      'informe-final': [
        { label: 'Análisis de calificaciones', order: 0 },
        { label: 'Acciones de mejora sugeridas al docente, con base a las visitas áulicas y al análisis de calificaciones', order: 1 },
        { label: 'Observaciones del Docente a la Materia', order: 2 },
        { label: 'Acciones de Mejora del Docente a la materia', order: 3 },
      ],
    };
    return map[slug] || [];
  };

  const getSectionsForType = (slug) => {
    const base = [
      { label: 'Información General', order: 0, section_type: 'header_table' },
      { label: 'Antecedentes', order: 1, section_type: 'free_text' },
      { label: 'Firma', order: 99, section_type: 'signature' },
    ];

    const extras = {
      'informe-inicial': [
        { label: 'Actividades', order: 2, section_type: 'free_text' },
        { label: 'Análisis de la Jefatura de Área', order: 3, section_type: 'free_text' },
      ],
      'informe-seguimiento': [
        { label: 'Objetivos', order: 2, section_type: 'free_text' },
        { label: 'Detalle', order: 3, section_type: 'description_text' },
        { label: 'Parámetros SB', order: 4, section_type: 'parameter_table' },
        { label: 'Observaciones y Acciones', order: 5, section_type: 'teacher_observation' },
        { label: 'Análisis del seguimiento realizado y acciones generales de mejora', order: 6, section_type: 'free_text' },
      ],
      'informe-visita': [
        { label: 'Objetivos', order: 2, section_type: 'free_text' },
        { label: 'Detalle', order: 3, section_type: 'description_text' },
        { label: 'Parámetros VA', order: 4, section_type: 'parameter_table' },
        { label: 'Observaciones y Análisis', order: 5, section_type: 'teacher_observation' },
        { label: 'Análisis del seguimiento realizado y acciones generales de mejora', order: 6, section_type: 'free_text' },
      ],
      'informe-final': [
        { label: 'Objetivos', order: 2, section_type: 'free_text' },
        { label: 'Detalle', order: 3, section_type: 'description_text' },
        { label: 'Parámetros VA (Final)', order: 4, section_type: 'parameter_table' },
        { label: 'Observaciones y Análisis Final', order: 5, section_type: 'teacher_observation' },
        { label: 'Análisis del seguimiento realizado y acciones generales de mejora', order: 6, section_type: 'free_text' },
      ],
    };

    const sections = [...base];
    const extra = extras[slug] || [];
    const insertAt = sections.findIndex(s => s.order === 99);
    sections.splice(insertAt, 0, ...extra);
    return sections;
  };

  // ──── CACHE ────
  const sectionCache = new Map();
  const fieldCache = new Map();

  async function getOrCreateSection(data) {
    const key = `${data.label_form_section}|${data.section_type}`;
    if (sectionCache.has(key)) return sectionCache.get(key);

    const existing = await db('api::form-section.form-section').findOne({
      where: { label_form_section: data.label_form_section, section_type: data.section_type },
    });
    if (existing) {
      sectionCache.set(key, existing);
      return existing;
    }

    const created = await db('api::form-section.form-section').create({ data });
    sectionCache.set(key, created);
    return created;
  }

  async function getOrCreateField(data) {
    const key = `${data.label_form_field}|${data.field_type}`;
    if (fieldCache.has(key)) return fieldCache.get(key);

    const existing = await db('api::form-field.form-field').findOne({
      where: { label_form_field: data.label_form_field },
    });
    if (existing) {
      fieldCache.set(key, existing);
      return existing;
    }

    const created = await db('api::form-field.form-field').create({ data });
    fieldCache.set(key, created);
    return created;
  }

  // ──── MAIN ────

  const tipos = [
    { label_type: 'Informe Inicial', type: 'informe-inicial', description: 'Informe inicial de Jefatura de Área' },
    { label_type: 'Informe de Seguimiento', type: 'informe-seguimiento', description: 'Informe de seguimiento de Jefatura de Área' },
    { label_type: 'Informe de Seguimiento con Visita', type: 'informe-visita', description: 'Informe de seguimiento y visita áulica de la Jefatura de Área' },
    { label_type: 'Informe Final', type: 'informe-final', description: 'Informe final de la Jefatura de Área' },
  ];

  for (const t of tipos) {
    console.log(`Creando: ${t.label_type}`);

    const ft = await db('api::form-type.form-type').create({ data: t });

    const version = await db('api::form-template-version.form-template-version').create({
      data: {
        label_template_version: 'Período 68',
        template_version: 'periodo 68',
        active: true,
        form_type: ft.id,
      },
    });

    const sectionsData = getSectionsForType(t.type);
    const sectionIds = [];

    for (const s of sectionsData) {
      const section = await getOrCreateSection({
        label_form_section: s.label,
        form_section: toSlug(s.label),
        order: s.order,
        section_type: s.section_type,
      });

      sectionIds.push(section.id);

      if (s.section_type === 'parameter_table') {
        const params = getParamsForType(t.type);
        for (let i = 0; i < params.length; i++) {
          const group = params[i].includes(':') ? params[i].split(':')[0].trim() : null;
          const field = await getOrCreateField({
            label_form_field: params[i],
            order: i,
            field_type: 'select',
            options: JSON.stringify(['Sí', 'No', 'Parcial']),
            required: false,
            group,
            render_as: 'grid_cell',
          });

          await db('api::form-field.form-field').update({
            where: { id: field.id },
            data: { form_sections: { connect: [{ id: section.id }] } },
          });
        }
      }

      if (s.section_type === 'teacher_observation') {
        const blocks = getObservationBlocksForType(t.type);
        for (const block of blocks) {
          const field = await getOrCreateField({
            label_form_field: block.label,
            order: block.order,
            field_type: 'textarea',
            required: false,
            group: null,
            render_as: 'observation_block',
          });

          await db('api::form-field.form-field').update({
            where: { id: field.id },
            data: { form_sections: { connect: [{ id: section.id }] } },
          });
        }
      }
    }

    await db('api::form-template-version.form-template-version').update({
      where: { id: version.id },
      data: { form_sections: sectionIds },
    });

    console.log(`  ✓ ${t.label_type} creado con ${sectionsData.length} secciones`);
  }

  console.log('\nSeed completado exitosamente.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
