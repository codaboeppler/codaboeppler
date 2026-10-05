/* Contacto de ventas y soporte: una sola fuente para las páginas que comparten navbar y footer
   (landing, punto de venta, marketplace, planes y precios) y para el botón flotante de los layouts. */

/* Número del WhatsApp Business de ventas, en formato internacional y solo dígitos (52 = México). */
const WHATSAPP_NUMERO = '525569750198';

export const contacto = {
  /* como se muestra en la página */
  tel: '55 6975 0198',
  telHref: `tel:+${WHATSAPP_NUMERO}`,
  email: 'ventas@ataskate.com',
};

/* Un clic abre el chat de WhatsApp con este mensaje ya escrito. */
export const WHATSAPP =
  `https://wa.me/${WHATSAPP_NUMERO}?text=` + encodeURIComponent('Hola, quiero más información de ataskate.');

/* Centro de ayuda de Zendesk (artículos de soporte). Es solo un enlace: el chat de Zendesk ya no se carga. */
export const AYUDA = 'https://ataskate.zendesk.com/hc/';
