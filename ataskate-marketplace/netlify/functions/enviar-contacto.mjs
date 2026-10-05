// Recibe el formulario de contacto del sitio promocional (ataskate-web) y lo
// manda por correo a ventas con Resend (https://resend.com), igual que
// enviar-cotizacion.mjs. Sin RESEND_API_KEY responde { ok, simulado } para que
// el sitio siga funcionando; con la key, entrega el correo de verdad.
const PARA = process.env.CONTACTO_PARA || 'ventas@ataskate.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const limpio = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const NU = "'Nunito',Arial,sans-serif";

// Mismos datos y mismo orden que pide ventas en "Generar código de invitación"
const CAMPOS = [
  ['negocio', 'Empresa'],
  ['rfc', 'RFC'],
  ['nombre', 'Nombre del Cliente'],
  ['correo', 'Correo electrónico'],
  ['telefono', 'Teléfono'],
  ['sucursales', 'No. Sucursales'],
  ['mensaje', 'Mensaje'],
  ['pagina', 'Página'],
];

function plantilla(d) {
  const filas = CAMPOS.filter(([k]) => d[k]).map(([k, label]) => `
    <tr>
      <td style="padding:8px 12px 8px 0;border-bottom:1px solid #ececf4;font-family:${NU};font-size:13px;color:#54575c;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ececf4;font-family:${NU};font-size:15px;color:#16181b;">${k === 'correo' ? `<a href="mailto:${esc(d[k])}" style="color:#5a5aff;">${esc(d[k])}</a>` : esc(d[k])}</td>
    </tr>`).join('');
  return `
  <div style="background:#f6f6fb;padding:24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;">
      <tr><td style="font-family:${NU};font-size:20px;font-weight:700;color:#0d166b;padding-bottom:4px;">Nuevo contacto desde el sitio</td></tr>
      <tr><td style="font-family:${NU};font-size:14px;color:#54575c;padding-bottom:16px;">${esc(d.nombre)}${d.negocio ? ' · ' + esc(d.negocio) : ''} pidió una demo. Responde a este correo para contactarle.</td></tr>
      <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${filas}</table></td></tr>
    </table>
  </div>`;
}

const texto = (d) => CAMPOS.filter(([k]) => d[k]).map(([k, label]) => `${label}: ${d[k]}`).join('\n');

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  // campo trampa para bots: si viene lleno, se responde ok sin enviar nada
  if (limpio(b.empresa_web, 200)) return json({ ok: true });

  const d = {
    nombre: limpio(b.nombre, 120),
    negocio: limpio(b.negocio, 120),
    rfc: limpio(b.rfc, 20).toUpperCase().replace(/[\s-]/g, ''),
    correo: limpio(b.correo, 160),
    telefono: limpio(b.telefono, 40),
    sucursales: limpio(b.sucursales, 20),
    mensaje: String(b.mensaje ?? '').trim().slice(0, 1500),
    pagina: limpio(b.pagina, 300),
  };
  if (!d.negocio) return json({ ok: false, error: 'Falta la empresa' }, 400);
  if (!d.nombre) return json({ ok: false, error: 'Falta el nombre' }, 400);
  // RFC obligatorio: 3 letras (moral) o 4 (física) + fecha AAMMDD + homoclave
  if (!/^[A-ZÑ&]{3,4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z\d]{2}[A\d]$/.test(d.rfc)) return json({ ok: false, error: 'RFC inválido' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo)) return json({ ok: false, error: 'Correo inválido' }, 400);
  if (d.telefono.replace(/\D/g, '').length < 10) return json({ ok: false, error: 'Teléfono inválido' }, 400);
  if (!/^[1-9]\d{0,3}$/.test(d.sucursales)) return json({ ok: false, error: 'Número de sucursales inválido' }, 400);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ ok: true, simulado: true });

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Ataskate <onboarding@resend.dev>',
      to: [PARA],
      reply_to: d.correo,
      subject: `Nuevo contacto: ${d.nombre}${d.negocio ? ' · ' + d.negocio : ''}`,
      html: plantilla(d),
      text: texto(d),
    }),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) return json({ ok: false, error: res.message || ('Resend ' + r.status) }, 502);
  return json({ ok: true, id: res.id });
};

export const config = { path: '/api/enviar-contacto' };
