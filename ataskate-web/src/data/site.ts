/* ============================================================
   ataskate — site content & SEO (es-MX)
   Single source of truth for the promo landing page.
   ============================================================ */

export const siteConfig = {
  name: 'ataskate',
  legalName: 'ataskate',
  url: 'https://ataskate.com.mx',
  language: 'es-MX',
  locale: 'es_MX',
  tagline: 'El sistema operativo de tu casa de empeño.',
  defaultTitle: 'ataskate — POS y sistema operativo para casas de empeño',
  description:
    'ataskate es el punto de venta y sistema de operación para casas de empeño: avalúo, empeño, refrendo, desempeño, inventario, almoneda, corte de caja y reportes en tiempo real. Multisucursal.',
  keywords: [
    'casa de empeño',
    'software para casa de empeño',
    'punto de venta casa de empeño',
    'sistema de empeño',
    'POS empeño',
    'avalúo prendas',
    'refrendo desempeño',
    'corte de caja',
    'inventario prendas',
    'almoneda',
    'multisucursal',
  ],
  /* PNG: X/Facebook/WhatsApp/LinkedIn do not render SVG social cards. */
  ogImage: '/brand/og.png',
  ogImageAlt: 'ataskate — punto de venta y operación para casas de empeño',
  /* Microsoft Clarity — proyecto del sitio promocional */
  clarityId: 'ypi6x94vpf',
  contact: {
    email: 'contacto@ataskate.com.mx',
    phone: '+52 55 1928 3047',
    whatsapp: '+52 55 1928 3047',
  },
  location: {
    city: 'Ciudad de México',
    region: 'CMX',
    country: 'México',
    countryCode: 'MX',
  },
} as const;

/* ---------- Hero stats ---------- */
export const heroStats = [
  { n: '60', prefix: '<', suffix: 's', label: 'para registrar un empeño' },
  { n: '100', suffix: '%', label: 'de las cajas cuadradas al corte' },
  { n: '6', label: 'módulos en un solo sistema' },
  { n: '24', suffix: '/7', label: 'operación multisucursal' },
];

/* ---------- Operación marquee ---------- */
export const operations = [
  'Empeño', 'Refrendo', 'Desempeño', 'Abono', 'Venta de artículos',
  'Avalúo', 'Corte de caja', 'Inventario', 'Almoneda', 'Traspaso entre sucursales',
];

/* ---------- Módulos (bento) ---------- */
export const modules = [
  {
    key: 'caja',
    tag: 'Caja',
    accent: 'var(--acc-cyan)',
    title: 'Caja y corte de turno',
    body:
      'Apertura y cierre de caja por turno y por cajero. Ingresos, egresos y total líquido en tiempo real — el corte cuadra solo.',
    points: ['Apertura / cierre por turno', 'Ingresos, egresos y líquido', 'Corte por sucursal y caja'],
  },
  {
    key: 'empeno',
    tag: 'Empeño',
    accent: 'var(--brand)',
    title: 'Empeño en segundos',
    body:
      'Registra la prenda, toma el avalúo sugerido y genera el préstamo y la boleta sin salir del mostrador.',
    points: ['Captura de prenda', 'Avalúo y préstamo máximo', 'Boleta / contrato al instante'],
    featured: true,
  },
  {
    key: 'refrendo',
    tag: 'Refrendo · Desempeño',
    accent: 'var(--acc-pink)',
    title: 'Refrendo, abono y desempeño',
    body:
      'El cliente regresa y resuelves en segundos: refrenda el plazo, abona al capital o desempeña su prenda con el historial completo a la vista.',
    points: ['Refrendo y renovación de plazo', 'Abonos parciales', 'Desempeño con historial'],
  },
  {
    key: 'inventario',
    tag: 'Inventario',
    accent: 'var(--acc-lime)',
    title: 'Inventario y almoneda',
    body:
      'Controla cada prenda en bodega, pásala a almoneda al vencer y registra la venta sin perder la trazabilidad del artículo.',
    points: ['Prendas por sucursal y bodega', 'Pase a almoneda', 'Venta de artículos'],
  },
  {
    key: 'avaluo',
    tag: 'Avalúo',
    accent: 'var(--acc-lemon)',
    title: 'Avalúo asistido',
    body:
      'Avalúo sugerido por tipo de artículo, porcentaje máximo de préstamo e historial de precios para decisiones consistentes en cada sucursal.',
    points: ['Avalúo sugerido por artículo', '% máximo de préstamo', 'Historial de avalúos'],
  },
  {
    key: 'reportes',
    tag: 'Reportes',
    accent: 'var(--acc-red)',
    title: 'Reportes y dashboard',
    body:
      'Ingresos, egresos y líquido por sucursal y caja. Avalúo y préstamo promedio, prendas activas y vencidas — en un solo tablero.',
    points: ['Tablero consolidado', 'Por sucursal y por caja', 'Avalúo y préstamo promedio'],
  },
];

/* ---------- Flujo de mostrador ---------- */
export const flow = [
  {
    n: '01',
    title: 'Avalúa la prenda',
    body: 'Captura el artículo y ataskate sugiere el avalúo y el préstamo máximo según tu política.',
  },
  {
    n: '02',
    title: 'Otorga el préstamo',
    body: 'Confirma monto, plazo e interés. La boleta y el contrato se imprimen al instante.',
  },
  {
    n: '03',
    title: 'Cobra refrendos y abonos',
    body: 'El cliente regresa: refrenda, abona o desempeña en segundos, con su historial a la vista.',
  },
  {
    n: '04',
    title: 'Cierra la caja',
    body: 'Corte por turno con ingresos, egresos y líquido cuadrados de forma automática.',
  },
];

/* ---------- Por qué ataskate (approach) ---------- */
export const reasons = [
  {
    title: 'Multisucursal real',
    body: 'Opera sucursales y bodegas desde un solo sistema y consolida prendas, cajas e ingresos en tiempo real.',
  },
  {
    title: 'Usuarios y permisos',
    body: 'Cada cajero con su rol y su sucursal asignada, y auditoría de cada movimiento de la operación.',
  },
  {
    title: 'Sin pérdidas por datos',
    body: 'El sistema valida cada avalúo y préstamo antes de cerrar la operación — nada se pierde a medias.',
  },
  {
    title: 'Hecho para el mostrador',
    body: 'Flujos rápidos pensados para atender al cliente sin filas, en cualquier sucursal.',
  },
];

/* ---------- FAQ ---------- */
export const faqs = [
  {
    q: '¿Qué es ataskate?',
    a: 'ataskate es el punto de venta y sistema de operación para casas de empeño: avalúo, empeño, refrendo, desempeño, abono, inventario, almoneda, corte de caja y reportes, todo en un solo lugar y para varias sucursales.',
  },
  {
    q: '¿Funciona con varias sucursales y bodegas?',
    a: 'Sí. ataskate es multisucursal: cada sucursal y bodega opera de forma independiente y la dirección ve todo consolidado en tiempo real.',
  },
  {
    q: '¿Puedo controlar usuarios y permisos por cajero?',
    a: 'Sí. Asignas roles y sucursales a cada usuario y queda registrada la auditoría de cada operación realizada en caja.',
  },
  {
    q: '¿Genera boletas y contratos de empeño?',
    a: 'Sí. Al otorgar el préstamo, la boleta y el contrato se generan e imprimen al instante desde el mostrador.',
  },
  {
    q: '¿Cómo controla el corte de caja?',
    a: 'Cada turno abre y cierra caja por cajero. Ingresos, egresos y total líquido se registran en automático y el corte cuadra solo.',
  },
  {
    q: '¿Cómo solicito una demostración?',
    a: 'Agenda una demo desde el botón de la página o escríbenos a contacto@ataskate.com.mx y te mostramos la operación completa.',
  },
];
