/**
 * Servicio orquestador de generacion de PDFs.
 *
 * Flujo general:
 * 1. Recibe un documentId de FormatManager
 * 2. Obtiene el informe completo de Strapi con todas sus relaciones
 * 3. Transforma los datos anidados en una estructura plana (ReportData)
 * 4. Delega en el generador especifico segun el tipo de formulario
 * 5. Retorna el buffer del PDF generado con pdfmake
 */
import type { Core } from '@strapi/strapi';
import pdfMake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

import * as inicial from './inicial';
import * as seguimiento from './seguimiento';
import * as seguimientoVisita from './seguimiento-visita';
import * as final from './final';
import type { FormSectionData, FormFieldData } from './utils';

// Registrar la fuente Helvetica (estandar, no requiere archivos externos)
pdfMake.fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

// Datos de un docente dentro del informe
export interface TeacherData {
  name: string;
  subject: string;
  cycle: string;
  group: string;
  project: string;
  code: string;
  fieldValues: Map<string, string>; // label_form_field → valor
}

// Datos completos del informe, ya transformados para la generacion del PDF
export interface ReportData {
  title: string;
  area: string;
  career: string;
  period: string;
  reportDate: string;
  jefeArea: string;
  formType: string;       // 'informe-inicial' | 'informe-seguimiento' | 'informe-visita' | 'informe-final'
  statusForm: string;     // 'draft' | 'completed' | 'archived'
  sectionTexts: Map<string, string>;  // label_seccion → contenido de texto libre
  teachers: TeacherData[];
  sections: FormSectionData[];         // Estructura de secciones y campos de la plantilla
}

// Enrutador: segun el tipo de formulario, usa el generador especifico
function generateDoc(data: ReportData): TDocumentDefinitions {
  switch (data.formType) {
    case 'informe-inicial':
      return inicial.generate(data);
    case 'informe-seguimiento':
      return seguimiento.generate(data);
    case 'informe-visita':
      return seguimientoVisita.generate(data);
    case 'informe-final':
      return final.generate(data);
    default:
      throw new Error(`Unknown form type: ${data.formType}`);
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generatePdf(documentId: string): Promise<Buffer> {
    // Obtener el informe completo con todas las relaciones necesarias
    const report = await strapi.documents('api::format-manager.format-manager').findOne({
      documentId,
      populate: [
        'user',
        'form_type',
        'form_template_version',
        'form_template_version.form_sections',          // Secciones de la plantilla
        'form_template_version.form_sections.form_fields', // Campos de cada seccion
        'section_values',                                 // Textos libres del informe
        'section_values.form_section',                    // Relacion section_value → form_section
        'teacher_entries',                                // Docentes evaluados
        'teacher_entries.field_values',                   // Valores de cada campo por docente
        'teacher_entries.field_values.form_field',         // Relacion field_value → form_field
      ],
    });

    if (!report) {
      throw new Error(`Report ${documentId} not found`);
    }

    // 1. Extraer estructura de secciones y campos desde la plantilla
    const templateVersion = report.form_template_version as Record<string, unknown> | undefined;
    const sections: FormSectionData[] = [];
    if (templateVersion?.form_sections) {
      for (const s of templateVersion.form_sections as Array<Record<string, unknown>>) {
        const fields: FormFieldData[] = [];
        if (s.form_fields) {
          for (const f of s.form_fields as Array<Record<string, unknown>>) {
            fields.push({
              label: (f.label_form_field as string) || '',
              fieldType: (f.field_type as string) || '',
              group: (f.group as string) || null,
              renderAs: (f.render_as as string) || null,
            });
          }
        }
        sections.push({
          label: (s.label_form_section as string) || '',
          sectionType: (s.section_type as string) || '',
          order: (s.order as number) || 0,
          fields,
        });
      }
      sections.sort((a, b) => a.order - b.order);
    }

    // 2. Extraer valores de secciones de texto libre
    const sectionTexts = new Map<string, string>();
    if (report.section_values) {
      for (const sv of report.section_values as Array<Record<string, unknown>>) {
        const sec = sv.form_section as Record<string, unknown> | undefined;
        if (sec?.label_form_section) {
          sectionTexts.set(sec.label_form_section as string, (sv.value as string) || '');
        }
      }
    }

    // 3. Extraer docentes con sus valores de campo
    const teachers: TeacherData[] = [];
    if (report.teacher_entries) {
      for (const te of report.teacher_entries as Array<Record<string, unknown>>) {
        const fvMap = new Map<string, string>();
        if (te.field_values) {
          for (const fv of te.field_values as Array<Record<string, unknown>>) {
            const field = fv.form_field as Record<string, unknown> | undefined;
            if (field?.label_form_field) {
              fvMap.set(field.label_form_field as string, (fv.value as string) || '');
            }
          }
        }
        teachers.push({
          name: (te.teacher_name as string) || '',
          subject: (te.subject as string) || '',
          cycle: (te.cycle as string) || '',
          group: (te.group as string) || '',
          project: (te.project as string) || '',
          code: (te.code as string) || '',
          fieldValues: fvMap,
        });
      }
    }

    // 4. Ensamblar datos del informe
    const user = report.user as Record<string, unknown> | undefined;
    const formType = report.form_type as Record<string, unknown> | undefined;

    const data: ReportData = {
      title: (formType?.label_type as string) || '',
      area: (report.area as string) || '',
      career: (report.career as string) || '',
      period: (templateVersion?.label_template_version as string) || '',
      reportDate: (report.report_date as string) || '',
      jefeArea: (user?.username as string) || '',
      formType: (formType?.type as string) || '',
      statusForm: (report.status_form as string) || 'completed',
      sectionTexts,
      teachers,
      sections,
    };

    // 5. Generar el documento PDF segun el tipo de formulario
    const docDef = generateDoc(data);
    return pdfMake.createPdf(docDef).getBuffer();
  },
});
