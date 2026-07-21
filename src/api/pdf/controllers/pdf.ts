/**
 * Controlador del endpoint de generacion de PDFs.
 * Recibe un documentId, delega en el servicio y retorna el PDF como descarga.
 */
export default {
  async generate(ctx: any) {
    const { documentId } = ctx.params;

    if (!documentId) {
      return ctx.badRequest('documentId is required');
    }

    try {
      const service = strapi.service('api::pdf.pdf');
      if (!service || typeof service.generatePdf !== 'function') {
        return ctx.badRequest('PDF service not available');
      }

      const pdfBuffer = await service.generatePdf(documentId);

      ctx.type = 'application/pdf';
      ctx.set('Content-Disposition', `attachment; filename="reporte-${documentId}.pdf"`);
      ctx.body = pdfBuffer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF generation failed';
      ctx.badRequest(message);
    }
  },
};
