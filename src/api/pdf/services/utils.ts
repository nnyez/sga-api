/**
 * Utilidades compartidas para la generacion de PDFs.
 *
 * Este modulo proporciona:
 * 1. Tipos de datos (FormFieldData, FormSectionData, ReportItem)
 * 2. Sistema de temas: colores y marca de agua segun el estado del informe
 * 3. Parseo de texto enriquecido (saltos de linea, listas, encabezados)
 * 4. Formateo de ReportItems a Content de pdfmake (formatItems)
 * 5. Ensamblado del documento PDF final (buildPdf, buildDoc)
 * 6. Renderizado de secciones dinamicas segun su tipo (renderSections)
 */
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { TeacherData } from './pdf';

// === Tipos de datos provenientes de Strapi ===

/** Informacion de un campo dentro de una seccion de la plantilla */
export interface FormFieldData {
  label: string;
  fieldType: string;
  group: string | null;
  renderAs: string | null;
}

/** Informacion de una seccion de la plantilla */
export interface FormSectionData {
  label: string;
  sectionType: string;
  order: number;
  fields: FormFieldData[];
}

// === ReportItem — representacion intermedia ===
//
// Los generadores especificos (inicial.ts, seguimiento.ts, etc.) producen
// una lista de ReportItems. Luego formatItems() los convierte a Content[]
// de pdfmake. Esta doble capa permite separar la logica de contenido
// de la logica de presentacion.

export type TableRow = { label: string; value: string };
export type SubjectEntry = { subject: string; cycle: string; group: string; teacher_name: string };

/** Cada tipo de item tiene sus propios campos de datos */
export type ReportItem =
  | { type: 'header_title'; text: string }
  | { type: 'section_header'; text: string }
  | { type: 'info_table'; rows: TableRow[] }
  | { type: 'subject_table'; entries: SubjectEntry[] }
  | { type: 'paragraph'; text: string }
  | { type: 'context_line'; text: string }
  | { type: 'numbered_list'; items: string[] }
  | { type: 'parameter_grid'; params: string[]; columns: string[]; data: string[][] }
  | { type: 'teacher_subsection'; name: string }
  | { type: 'observation_block'; label: string; value: string }
  | { type: 'spacer' }
  | { type: 'signature'; name: string; area: string };

// === Tema visual — colores y marca de agua segun estado ===
//
// El estado del informe (completed/draft/archived) determina:
// - Color primario (azul UPS, rojo borrador, gris archivado)
// - Marca de agua (ninguna, BORRADOR, ARCHIVADO)

export interface PdfTheme {
  primary: string;
  primaryText: string;
  watermark: { text: string; color: string; opacity: number } | null;
}

const COLORS = {
  upsBlue: '#003772',
  upsGray: '#f5f6f8',
  white: '#FFFFFF',
  black: '#000000',
} as const;

const THEMES: Record<string, PdfTheme> = {
  completed: {
    primary: COLORS.upsBlue,
    primaryText: COLORS.white,
    watermark: null,
  },
  draft: {
    primary: '#CC0000',
    primaryText: COLORS.white,
    watermark: { text: 'BORRADOR', color: '#CC0000', opacity: 0.12 },
  },
  archived: {
    primary: '#666666',
    primaryText: COLORS.white,
    watermark: { text: 'ARCHIVADO', color: '#666666', opacity: 0.12 },
  },
};

function getTheme(statusForm?: string): PdfTheme {
  return THEMES[statusForm || 'completed'] || THEMES.completed;
}

const MARGINS = [60, 60, 60, 60] as [number, number, number, number];

// === Parseo de texto enriquecido ===
//
// Convierte texto plano con formato simple en ReportItems:
// - \n\n separa bloques (cada bloque se procesa linea por linea)
// - \n simple separa lineas
// - ; separa items de una lista numerada
// - Texto en MAYUSCULAS se interpreta como encabezado de seccion

function parseRichText(text: string): ReportItem[] {
  if (!text?.trim()) return [];

  const items: ReportItem[] = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Bloques separados por doble salto de linea
  if (normalized.includes('\n\n')) {
    const blocks = normalized.split('\n\n').filter((b) => b.trim());
    for (let bi = 0; bi < blocks.length; bi++) {
      const lines = blocks[bi].split('\n').filter((l) => l.trim());
      for (const line of lines) {
        const t = line.trim();
        if (/^[A-ZÁÉÍÓÚÑ\s]{3,}$/.test(t)) {
          items.push({ type: 'section_header', text: t });
        } else {
          items.push({ type: 'paragraph', text: t });
        }
      }
      if (bi < blocks.length - 1) items.push({ type: 'spacer' });
    }
    return items;
  }

  // Lineas separadas por salto simple
  if (normalized.includes('\n')) {
    const lines = normalized.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        items.push({ type: 'spacer' });
      } else if (/^[A-ZÁÉÍÓÚÑ\s]{3,}$/.test(t)) {
        items.push({ type: 'section_header', text: t });
      } else {
        items.push({ type: 'paragraph', text: t });
      }
    }
    return items;
  }

  // Lista separada por punto y coma
  if (normalized.includes(';')) {
    const segments = normalized.split(';').map((s) => s.trim()).filter(Boolean);
    if (segments.length > 1) {
      items.push({ type: 'numbered_list', items: segments });
      return items;
    }
  }

  items.push({ type: 'paragraph', text: normalized.trim() });
  return items;
}

// === Helpers de tablas ===

/** Crea una celda de tabla con texto y opciones */
function cell(text: string, opts: Record<string, unknown> = {}): TableCell {
  return { text, ...opts } as unknown as TableCell;
}

/** Layout de tabla con bordes finos */
function tableLayout() {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => COLORS.black,
    vLineColor: () => COLORS.black,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
}

// === Formateo: ReportItem[] → Content[] ===
//
// Convierte la representacion intermedia en objetos Content de pdfmake.
// Cada tipo de ReportItem tiene un case en el switch que produce el
// formato visual correspondiente (tablas, parrafos, lineas, etc.)

export function formatItems(items: ReportItem[], theme: PdfTheme): Content[] {
  const result: Content[] = [];

  for (const item of items) {
    switch (item.type) {
      // Titulo principal del informe, centrado con linea debajo
      case 'header_title':
        result.push({
          text: item.text,
          fontSize: 18,
          bold: true,
          alignment: 'center',
          color: theme.primary,
          margin: [0, 0, 0, 4],
        });
        result.push({
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 492,
              y2: 0,
              lineWidth: 1,
              lineColor: theme.primary,
            },
          ],
          margin: [0, 0, 0, 10],
        });
        break;

      // Encabezado de seccion (fondo de color primario, texto blanco)
      case 'section_header':
        result.push({
          layout: 'noBorders',
          table: {
            widths: ['*'],
            body: [[
              cell(item.text, {
                fillColor: theme.primary,
                color: theme.primaryText,
                alignment: 'center',
                bold: true,
                fontSize: 10,
                margin: [4, 4, 4, 4],
              }),
            ]],
          },
          margin: [0, 8, 0, 4],
        });
        break;

      // Tabla de informacion general (label → value)
      case 'info_table': {
        const body: TableCell[][] = [
          [
            cell('Información General', {
              fillColor: theme.primary,
              color: theme.primaryText,
              alignment: 'center',
              bold: true,
              fontSize: 9,
              margin: [4, 3, 4, 3],
              colSpan: 2,
            }),
            cell(''),
          ],
          ...item.rows.map((r) => [
            cell(r.label, { fillColor: COLORS.upsGray, bold: true, fontSize: 8, margin: [4, 2, 4, 2] }),
            cell(r.value, { fontSize: 8, margin: [4, 2, 4, 2] }),
          ]),
        ];
        result.push({
          layout: tableLayout(),
          table: { widths: ['30%', '70%'], body },
          margin: [0, 0, 0, 6],
        });
        break;
      }

      // Tabla de asignaturas agrupadas por docente
      case 'subject_table':
        if (!item.entries.length) {
          result.push({ text: 'Sin asignaturas registradas', fontSize: 8, margin: [0, 4, 0, 4] });
          break;
        }

        // Agrupar entradas por nombre de docente
        const groups = new Map<string, SubjectEntry[]>();
        for (const e of item.entries) {
          const list = groups.get(e.teacher_name) || [];
          list.push(e);
          groups.set(e.teacher_name, list);
        }

        const subjBody: TableCell[][] = [];
        let firstGroup = true;

        for (const [teacher, teacherEntries] of groups) {
          if (!firstGroup) {
            subjBody.push([cell(''), cell(''), cell('')]);
          }
          firstGroup = false;

          subjBody.push([
            cell(`Docente: ${teacher}`, {
              fillColor: theme.primary,
              color: theme.primaryText,
              bold: true,
              fontSize: 8,
              margin: [4, 3, 4, 3],
              colSpan: 3,
            }),
            cell(''),
            cell(''),
          ]);

          subjBody.push([
            cell('ASIGNATURA', {
              fillColor: COLORS.upsGray, bold: true, fontSize: 8, alignment: 'center', margin: [3, 2, 3, 2],
            }),
            cell('CICLO', {
              fillColor: COLORS.upsGray, bold: true, fontSize: 8, alignment: 'center', margin: [3, 2, 3, 2],
            }),
            cell('GRUPO', {
              fillColor: COLORS.upsGray, bold: true, fontSize: 8, alignment: 'center', margin: [3, 2, 3, 2],
            }),
          ]);

          for (const entry of teacherEntries) {
            subjBody.push([
              cell(entry.subject, { fontSize: 8, margin: [3, 2, 3, 2] }),
              cell(entry.cycle, { fontSize: 8, alignment: 'center', margin: [3, 2, 3, 2] }),
              cell(entry.group, { fontSize: 8, alignment: 'center', margin: [3, 2, 3, 2] }),
            ]);
          }
        }

        result.push({
          layout: {
            hLineWidth: (i: number) => (i <= 1 ? 1 : 0.5),
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.black,
            vLineColor: () => COLORS.black,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          table: { widths: ['*', 'auto', 'auto'], body: subjBody },
          margin: [0, 4, 0, 4],
        });
        break;

      // Parrafo de texto justificado
      case 'paragraph':
        result.push({
          text: item.text,
          fontSize: 8,
          alignment: 'justify',
          margin: [0, 1, 0, 1],
        });
        break;

      // Linea de contexto (asignatura, grupo, ciclo dentro de observaciones)
      case 'context_line':
        result.push({
          text: item.text,
          fontSize: 10,
          bold: true,
          color: theme.primary,
          margin: [0, 6, 0, 2],
        });
        break;

      // Lista numerada
      case 'numbered_list':
        item.items.forEach((entry, i) => {
          result.push({
            text: `${i + 1}. ${entry}`,
            fontSize: 8,
            alignment: 'justify',
            margin: [0, 1, 0, 1],
          });
        });
        break;

      // Grilla de parametros: filas = parametros, columnas = docente/asignatura
      case 'parameter_grid': {
        const n = item.columns.length + 1;
        const header: TableCell[] = [
          cell('Parámetro', {
            fillColor: theme.primary, color: theme.primaryText, alignment: 'center',
            bold: true, fontSize: 8, margin: [2, 2, 2, 2],
          }),
          ...item.columns.map((c) =>
            cell(c, {
              fillColor: theme.primary, color: theme.primaryText, alignment: 'center',
              bold: true, fontSize: 8, margin: [2, 2, 2, 2],
            }),
          ),
        ];
        const body: TableCell[][] = [header];
        for (let r = 0; r < item.params.length; r++) {
          body.push([
            cell(item.params[r], { fontSize: 8, margin: [2, 2, 2, 2] }),
            ...item.data[r].map((v) =>
              cell(v || '-', { fontSize: 8, alignment: 'center', margin: [2, 2, 2, 2] }),
            ),
          ]);
        }
        result.push({
          layout: {
            hLineWidth: (i: number) => (i <= 1 ? 1 : 0.5),
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.black,
            vLineColor: () => COLORS.black,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          table: {
            widths: ['30%', ...Array(n - 1).fill(`${70 / (n - 1)}%`)],
            body,
          },
          margin: [0, 4, 0, 6],
        });
        break;
      }

      // Separador de docente en secciones de observacion
      case 'teacher_subsection':
        result.push({
          text: `Docente: ${item.name}`,
          bold: true,
          fontSize: 11,
          alignment: 'center',
          color: theme.primary,
          margin: [0, 10, 0, 4],
        });
        break;

      // Bloque de observacion: label + valor (textarea del frontend)
      case 'observation_block': {
        result.push({
          text: `${item.label}:`,
          bold: true,
          fontSize: 8,
          color: theme.primary,
          margin: [0, 4, 0, 1],
        });
        const text = item.value?.trim();
        if (!text) {
          result.push({ text: 'Sin información', fontSize: 8, margin: [0, 1, 0, 2] });
          break;
        }

        // Formato ListInput: items separados por salto de linea
        if (text.includes('\n')) {
          const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
          lines.forEach((line, i) => {
            result.push({
              text: `${i + 1}. ${line}`,
              fontSize: 8,
              alignment: 'justify',
              margin: [0, 1, 0, 1],
            });
          });
          break;
        }

        // Formato legacy: items separados por punto y coma
        if (text.includes(';')) {
          const segments = text.split(';').map((s) => s.trim()).filter(Boolean);
          if (segments.length > 1) {
            segments.forEach((seg, i) => {
              result.push({
                text: `${i + 1}. ${seg}`,
                fontSize: 8,
                alignment: 'justify',
                margin: [0, 1, 0, 1],
              });
            });
          } else {
            result.push({ text, fontSize: 8, alignment: 'justify', margin: [0, 2, 0, 4] });
          }
          break;
        }

        // Parrafo simple
        result.push({ text, fontSize: 8, alignment: 'justify', margin: [0, 2, 0, 4] });
        break;
      }

      // Espaciador vertical
      case 'spacer':
        result.push({ text: '', margin: [0, 6, 0, 0] });
        break;

      // Bloque de firma: espacio + linea + nombre y cargo
      case 'signature':
        result.push({ text: '', margin: [0, 40, 0, 0] });
        result.push({
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 },
          ],
          alignment: 'center',
          margin: [0, 0, 0, 6],
        });
        result.push({
          text: `${item.name}\nJefe de Área de ${item.area}`,
          fontSize: 10,
          alignment: 'center',
          margin: [0, 0, 0, 0],
        });
        break;
    }
  }

  return result;
}

// === Ensamblado del documento PDF ===

/** Construye la estructura TDocumentDefinitions con el contenido y tema */
export function buildDoc(content: Content[], theme: PdfTheme): TDocumentDefinitions {
  const doc: TDocumentDefinitions = {
    content,
    defaultStyle: { font: 'Helvetica', fontSize: 9 },
    pageMargins: MARGINS,
    pageSize: 'LETTER',
  };

  if (theme.watermark) {
    doc.watermark = {
      ...theme.watermark,
      bold: true,
      angle: -45,
      fontSize: 60,
    };
  }

  return doc;
}

// === Orquestador de construccion ===
//
// Funcion principal que usan los generadores especificos:
// 1. Obtiene el tema segun el estado
// 2. Formatea los items
// 3. Ensambla el documento

export function buildPdf(items: ReportItem[], statusForm?: string): TDocumentDefinitions {
  const theme = getTheme(statusForm);
  const content = formatItems(items, theme);
  return buildDoc(content, theme);
}

// === Renderizado de secciones dinamicas ===
//
// Recorre las secciones de la plantilla y para cada una genera
// los ReportItems correspondientes segun su tipo.
// Las secciones header_table y signature se omiten porque ya
// son manejadas por los generadores especificos.

export function renderSections(
  sections: FormSectionData[],
  teachers: TeacherData[],
  sectionTexts: Map<string, string>,
): ReportItem[] {
  const items: ReportItem[] = [];

  // Agrupar docentes por nombre (un docente puede tener multiples asignaturas)
  const teacherGroups = new Map<string, TeacherData[]>();
  for (const t of teachers) {
    const list = teacherGroups.get(t.name) || [];
    list.push(t);
    teacherGroups.set(t.name, list);
  }

  for (const section of sections) {
    switch (section.sectionType) {
      // Estas secciones se manejan en los generadores especificos, no aqui
      case 'header_table':
      case 'signature':
        continue;

      // Secciones de texto: se muestra el encabezado y el contenido libre
      case 'description_text':
      case 'free_text': {
        const text = sectionTexts.get(section.label) || '';
        items.push({ type: 'section_header', text: section.label });
        if (text?.trim()) {
          items.push(...parseRichText(text));
        }
        break;
      }

      // Tabla de parametros: grilla con filas = campos, columnas = docente/asignatura
      // Se agrupan de a 3 columnas por pagina para facilitar la lectura
      case 'parameter_table': {
        const ordered = section.fields
          .filter((f) => f.renderAs === 'grid_cell' || !f.renderAs)
          .sort((a, b) => a.label.localeCompare(b.label));
        const paramLabels = ordered.map((f) => f.label);
        if (!paramLabels.length) continue;

        items.push({ type: 'section_header', text: section.label });

        for (const [, entries] of teacherGroups) {
          const name = entries[0].name;
          items.push({ type: 'teacher_subsection', name });

          // Paginacion de columnas: maximo 3 docente/asignatura por grilla
          for (let start = 0; start < entries.length; start += 3) {
            const chunk = entries.slice(start, start + 3);
            const cols = chunk.map((t) => `${t.subject} - ${t.group}`);
            const gridData = paramLabels.map((param) =>
              chunk.map((t) => t.fieldValues.get(param) || '-'),
            );
            items.push({
              type: 'parameter_grid',
              params: paramLabels,
              columns: cols,
              data: gridData,
            });
          }
        }
        break;
      }

      // Observaciones por docente: bloques de texto para cada campo textarea
      case 'teacher_observation': {
        const obsFields = section.fields.filter((f) => f.fieldType === 'textarea');
        if (!obsFields.length) continue;

        items.push({ type: 'section_header', text: section.label });

        for (const [, entries] of teacherGroups) {
          const name = entries[0].name;
          items.push({ type: 'teacher_subsection', name });

          for (const entry of entries) {
            items.push({
              type: 'context_line',
              text: `${entry.subject} — Grupo: ${entry.group} — Ciclo: ${entry.cycle}`,
            });

            for (const field of obsFields) {
              items.push({
                type: 'observation_block',
                label: field.label,
                value: entry.fieldValues.get(field.label) || '',
              });
            }
          }
        }
        break;
      }
    }
  }

  return items;
}
