/**
 * Generador de PDF para el tipo "Informe Final".
 *
 * Version final del ciclo de evaluacion. Incluye parametros VA Final
 * (4 campos select) y 4 bloques de observacion que sintetizan el periodo.
 *
 * La funcion renderSections (de utils.ts) recorre las secciones de la plantilla
 * y genera los items correspondientes segun el tipo de cada seccion.
 */
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ReportData } from './pdf';
import { type ReportItem, renderSections, buildPdf } from './utils';

export function generate(data: ReportData): TDocumentDefinitions {
  const items: ReportItem[] = [
    { type: 'header_title', text: data.title || 'Informe Final' },
    {
      type: 'info_table',
      rows: [
        { label: 'Carrera(s):', value: data.career },
        { label: 'Periodo Académico:', value: data.period },
        { label: 'Actividad:', value: `Seguimiento y evaluación del Área de ${data.area}` },
        { label: 'Fecha del informe:', value: data.reportDate },
        { label: 'Elaborado por:', value: data.jefeArea },
      ],
    },
    {
      type: 'subject_table',
      entries: data.teachers.map((t) => ({
        subject: t.subject,
        cycle: t.cycle,
        group: t.group,
        teacher_name: t.name,
      })),
    },
    ...renderSections(data.sections, data.teachers, data.sectionTexts),
    { type: 'signature', name: data.jefeArea, area: data.area },
  ];

  return buildPdf(items, data.statusForm);
}
