/**
 * Ruta personalizada para generacion de PDFs.
 * Endpoint: GET /api/pdf/generate/:documentId
 * Requiere autenticacion JWT.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/pdf/generate/:documentId',
      handler: 'pdf.generate',
      config: {
        auth: { enabled: true },
        policies: [],
        middlewares: [],
      },
    },
  ],
};
