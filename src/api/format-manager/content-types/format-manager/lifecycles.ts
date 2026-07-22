function resolveWhere(where: Record<string, unknown>) {
  if (where.id) return { id: where.id };
  if (where.documentId) return { documentId: where.documentId };
  return null;
}

export default {
  async beforeUpdate(event) {
    const filter = resolveWhere(event.params.where);
    if (!filter) return;
    const oldEntry = await strapi.db
      .query('api::format-manager.format-manager')
      .findOne({ where: filter });
    event.state = { oldStatus: oldEntry?.status_form };
  },

  async afterUpdate(event) {
    const { params, result, state } = event;

    if (state.oldStatus !== 'draft') return;
    if (params.data?.status_form !== 'completed') return;

    const filter = resolveWhere(
      result ? { id: result.id, documentId: result.documentId } : event.params.where,
    );
    if (!filter) return;

    const entry = await strapi.db
      .query('api::format-manager.format-manager')
      .findOne({
        where: filter,
        populate: ['user', 'form_template_version', 'form_type'],
      });

    if (!entry?.user?.email) return;

    const formType = entry.form_type?.label_type || 'Informe';
    const userName = `${entry.user.username || entry.user.email}`;
    const areaName = entry.area || 'su área';

    const currentYear = new Date().getFullYear();

    const subject = `Informe Finalizado — ${formType}`;

    const htmlForReporter = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #333;">
        <div style="border-bottom: 3px solid #003B71; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px; color: #003B71;">Sistema de Gesti\u00f3n de Servicio Comunitario</h1>
        </div>
        <p style="margin: 0 0 16px;">Estimado/a <strong>${userName}</strong>:</p>
        <p style="margin: 0 0 16px; line-height: 1.6;">
          Por medio del presente, se le notifica que el informe <strong>«${formType}»</strong>
          correspondiente a <strong>${areaName}</strong> ha sido
          <strong style="color: #003B71;">finalizado exitosamente</strong> en el sistema.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f6f8; font-weight: 600; width: 140px;">Tipo de informe</td>
            <td style="padding: 8px 12px; background: #f5f6f8;">${formType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Estado</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Completado</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px;">Responsable</td>
            <td style="padding: 8px 12px;">${userName}</td>
          </tr>
        </table>
        <p style="margin: 0 0 16px; line-height: 1.6;">
          El registro se encuentra disponible para su revisi\u00f3n por parte del administrador del sistema.
          Agradecemos su compromiso y diligencia en la elaboraci\u00f3n de este informe.
        </p>
        <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px;">
          <p style="margin: 0; font-size: 13px; color: #666;">
            <strong>Sistema de Gesti\u00f3n de Servicio Comunitario</strong><br>
            Universidad Polit\u00e9cnica Salesiana &mdash; ${currentYear}
          </p>
        </div>
      </div>
    `;

    const htmlForAdmin = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #333;">
        <div style="border-bottom: 3px solid #003B71; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px; color: #003B71;">Sistema de Gesti\u00f3n de Servicio Comunitario</h1>
        </div>
        <p style="margin: 0 0 16px;">Estimado/a <strong>Administrador(a)</strong>:</p>
        <p style="margin: 0 0 16px; line-height: 1.6;">
          Se le informa que el/la jefe(a) de <strong>${areaName}</strong>,
          <strong>${userName}</strong>, ha finalizado el informe
          <strong>«${formType}»</strong> en el sistema de gesti\u00f3n de servicio comunitario.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f6f8; font-weight: 600; width: 140px;">Tipo de informe</td>
            <td style="padding: 8px 12px; background: #f5f6f8;">${formType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Estado</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Completado</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Jefe de \u00e1rea</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px;">\u00c1rea</td>
            <td style="padding: 8px 12px;">${areaName}</td>
          </tr>
        </table>
        <p style="margin: 0 0 16px; line-height: 1.6;">
          El registro ha sido marcado como <strong>Completado</strong> y est\u00e1 disponible para su revisi\u00f3n
          y las acciones correspondientes.
        </p>
        <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px;">
          <p style="margin: 0; font-size: 13px; color: #666;">
            <strong>Sistema de Gesti\u00f3n de Servicio Comunitario</strong><br>
            Universidad Polit\u00e9cnica Salesiana &mdash; ${currentYear}
          </p>
        </div>
      </div>
    `;

    try {
      await strapi.plugin('email').service('email').send({
        to: entry.user.email,
        subject,
        html: htmlForReporter,
      });

      const admins = await strapi.db
        .query('plugin::users-permissions.user')
        .findMany({ where: { role_type: 'admin' } });

      for (const admin of admins) {
        if (admin.email && admin.email !== entry.user.email) {
          await strapi.plugin('email').service('email').send({
            to: admin.email,
            subject,
            html: htmlForAdmin,
          });
        }
      }
    } catch (err) {
      strapi.log.error('[Email notification] Error sending:', err);
    }
  },
};
