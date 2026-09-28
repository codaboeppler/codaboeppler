// Envía la cotización por correo real usando Resend (https://resend.com).
// Sin RESEND_API_KEY configurada responde { ok, simulado } para que el
// prototipo siga funcionando; con la key, entrega el correo de verdad.
const SITE = 'https://ataskate-marketplace-preview.netlify.app';

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

const abs = (src) => (/^https?:/.test(src || '') ? src : SITE + '/' + String(src || '').replace(/^\/+/, ''));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mxn = (n) => '$' + Number(n || 0).toLocaleString('en-US');
const NU = "'Nunito',Arial,sans-serif";

// iconos de servicios rasterizados del design system (Gmail no muestra SVG)
const SVC_ICO = ['renew', 'tag', 'pay', 'cal', 'caja', 'escudo', 'pin', 'reloj', 'rayo']
  .reduce((m, k) => ((m[k] = SITE + '/img/email/svc-' + k + '.png'), m), {});

const SVCS_DEFAULT = [
  { n: 'Refrendo en sucursal', i: 'renew' },
  { n: 'Desempeño en sucursal', i: 'tag' },
  { n: 'Extensión en sucursal', i: 'cal' },
  { n: 'Pago con tarjeta o transferencia', i: 'pay' },
];

function plantilla(d) {
  const filasArts = (d.articulos || []).map((a) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #ececf4;">
        <img src="${abs(a.img)}" width="40" height="40" alt="" style="border-radius:8px;object-fit:cover;vertical-align:middle;" />
        <span style="font-family:${NU};font-size:14px;color:#2a2c2f;padding-left:10px;">${esc(a.nombre)}</span>
      </td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #ececf4;font-family:${NU};font-size:16px;font-weight:600;color:#16181b;">${mxn(a.monto)}</td>
    </tr>`).join('');

  const casa = d.casa || {};
  const folio = esc(d.folio || 'CTZ-00000');
  const vence = esc(d.vence || (d.vigencia || '').replace(/^hasta el /, '') || 'la fecha indicada');

  // servicios en dos columnas, chip lila + nombre como en la web
  const svcs = (Array.isArray(d.servicios) && d.servicios.length ? d.servicios : SVCS_DEFAULT).slice(0, 10);
  let filasSvc = '';
  for (let i = 0; i < svcs.length; i += 2) {
    const celda = (s) => s ? `
      <td width="50%" style="padding:7px 8px 7px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="40" valign="middle"><img src="${SVC_ICO[s.i] || SVC_ICO.escudo}" width="32" height="32" alt="" style="display:block;border-radius:9px;" /></td>
          <td valign="middle" style="font-family:${NU};font-size:13px;font-weight:600;color:#2a2c2f;line-height:1.35;">${esc(s.n)}</td>
        </tr></table>
      </td>` : '<td width="50%"></td>';
    filasSvc += '<tr>' + celda(svcs[i]) + celda(svcs[i + 1]) + '</tr>';
  }

  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Platypi:wght@600&display=swap" rel="stylesheet" />
  <title>Tu cotización Ataskate</title></head>
  <body style="margin:0;padding:0;background:#f6f6fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6fa;padding:24px 12px 0;"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px 16px 0 0;overflow:hidden;border:1px solid #e6e7e9;border-bottom:none;">
    <tr><td align="center" style="background:#d5a4ff;padding:28px 24px;">
      <img src="${SITE}/img/logo-email.png" width="180" alt="Ataskate" style="display:block;" />
    </td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <p style="margin:0 0 4px;font-family:${NU};font-size:14px;color:#54575c;">Hola,</p>
      <h1 style="margin:0 0 6px;font-family:'Platypi',Georgia,serif;font-size:24px;color:#0d166b;">Aquí está tu cotización</h1>
      <p style="margin:0;font-family:${NU};font-size:14px;color:#54575c;line-height:1.5;">El estimado de tus artículos y lo que te presta esta casa de empeño.</p>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filasArts}
        <tr>
          <td style="padding:12px 0;font-family:${NU};font-size:14px;color:#54575c;">Total aprox.</td>
          <td align="right" style="padding:12px 0;font-family:${NU};font-size:16px;font-weight:700;color:#16181b;">${mxn(d.total)} MXN</td>
        </tr>
      </table>
    </td></tr>
    ${casa.nombre ? `
    <tr><td style="padding:8px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfbfe;border:1px solid #f0f0f2;border-radius:12px;">
        <tr>
          <td style="padding:16px;">
            ${casa.logo ? `<img src="${abs(casa.logo)}" width="44" height="44" alt="" style="border-radius:10px;object-fit:contain;background:#fff;border:1px solid #e6e7e9;vertical-align:middle;" />` : ''}
            <span style="display:inline-block;vertical-align:middle;padding-left:10px;">
              <span style="display:block;font-family:${NU};font-size:16px;font-weight:700;color:#16181b;">${esc(casa.nombre)}</span>
              <span style="display:block;font-family:${NU};font-size:12px;color:#54575c;">${esc(casa.detalle || '')}</span>
            </span>
          </td>
          <td align="right" style="padding:16px;">
            <span style="display:inline-block;background:#effaf4;border-radius:10px;padding:10px 14px;text-align:center;">
              <span style="display:block;font-family:${NU};font-size:16px;font-weight:700;color:#309c60;">${mxn(d.recibe)}</span>
              <span style="display:block;font-family:${NU};font-size:12px;color:#54575c;">Recibes hoy*</span>
            </span>
          </td>
        </tr>
        <tr><td colspan="2" style="padding:0 16px 14px;">
          <div style="border-top:1px solid #ececf4;padding-top:10px;font-family:${NU};font-size:12px;color:#54575c;">
            Refrendo <b style="color:#16181b;">${mxn(d.refrendo)}/mes</b> &nbsp;·&nbsp; Desempeño <b style="color:#16181b;">${mxn(d.desempeno)}</b>
          </div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:12px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfbfe;border:1px solid #f0f0f2;border-radius:12px;">
        <tr><td style="padding:16px 16px 8px;">
          <p style="margin:0;font-family:${NU};font-size:14px;font-weight:700;color:#16181b;">Servicios disponibles en esta sucursal</p>
        </td></tr>
        <tr><td style="padding:0 16px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filasSvc}</table>
        </td></tr>
      </table>
    </td></tr>` : ''}
    <tr><td style="padding:12px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0ff;border-radius:12px;">
        <tr>
          <td style="padding:18px 6px 18px 18px;">
            <p style="margin:0 0 4px;font-family:${NU};font-size:14px;font-weight:700;color:#0d166b;">Muéstrala en sucursal</p>
            <p style="margin:0 0 8px;font-family:${NU};font-size:12px;color:#54575c;line-height:1.5;">El valuador puede escanear este código para leer tu cotización y atenderte más rápido.</p>
            <p style="margin:0;font-family:${NU};font-size:12px;color:#54575c;">Folio <b style="color:#16181b;">${folio}</b></p>
          </td>
          <td align="right" width="124" style="padding:14px 14px 14px 0;">
            <img src="${SITE}/img/email/qr-cotizacion.png" width="104" height="104" alt="Código QR de tu cotización" style="display:block;background:#ffffff;border-radius:10px;padding:6px;" />
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 28px 8px;">
      <a href="${SITE}/#cuenta" style="display:inline-block;background:#5a5aff;color:#ffffff;font-family:${NU};font-size:14px;font-weight:700;text-decoration:none;border-radius:100px;padding:12px 26px;">Ver mi cuenta</a>
      <span style="display:inline-block;width:8px;"></span>
      <a href="${SITE}/" style="display:inline-block;background:#ffffff;color:#5a5aff;font-family:${NU};font-size:14px;font-weight:700;text-decoration:none;border-radius:100px;padding:11px 26px;border:1px solid #acacff;">Ir al marketplace</a>
    </td></tr>
    <tr><td align="center" style="padding:8px 40px 12px;">
      <p style="margin:0;font-family:${NU};font-size:13px;color:#54575c;line-height:1.6;text-align:center;">Te enviamos el estimado de tus artículos para que lo tengas a la mano. Tu cotización es válida por 5 días: tienes hasta el <b style="color:#16181b;">${vence}</b> para presentarla en sucursal.</p>
    </td></tr>
    <tr><td style="padding:0 28px 24px;">
      <p style="margin:0;font-family:${NU};font-size:11px;color:#71767d;line-height:1.5;text-align:center;">*El monto final queda a criterio del valuador en sucursal.</p>
    </td></tr>
  </table>
  <!-- footer de correo: compacto, marca + redes + legal -->
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0d166b;border-radius:0 0 16px 16px;overflow:hidden;">
    <tr><td align="center" style="padding:26px 28px 14px;">
      <img src="${SITE}/img/email/logo-blanco.png" width="120" alt="Ataskate" style="display:inline-block;" />
    </td></tr>
    <tr><td align="center" style="padding:0 28px 16px;">
      <a href="${SITE}/#" style="text-decoration:none;padding:0 5px;"><img src="${SITE}/img/email/soc-fb.png" width="30" height="30" alt="Facebook" style="vertical-align:middle;border-radius:50%;" /></a>
      <a href="${SITE}/#" style="text-decoration:none;padding:0 5px;"><img src="${SITE}/img/email/soc-x.png" width="30" height="30" alt="X" style="vertical-align:middle;border-radius:50%;" /></a>
      <a href="${SITE}/#" style="text-decoration:none;padding:0 5px;"><img src="${SITE}/img/email/soc-ig.png" width="30" height="30" alt="Instagram" style="vertical-align:middle;border-radius:50%;" /></a>
      <a href="${SITE}/#" style="text-decoration:none;padding:0 5px;"><img src="${SITE}/img/email/soc-wa.png" width="30" height="30" alt="WhatsApp" style="vertical-align:middle;border-radius:50%;" /></a>
    </td></tr>
    <tr><td align="center" style="padding:0 28px 18px;border-bottom:1px solid rgba(255,255,255,.14);">
      <a href="${SITE}/#" style="font-family:${NU};font-size:12px;font-weight:600;color:rgba(255,255,255,.85);text-decoration:none;padding:0 10px;">Centro de ayuda</a>
      <a href="${SITE}/#" style="font-family:${NU};font-size:12px;font-weight:600;color:rgba(255,255,255,.85);text-decoration:none;padding:0 10px;">Términos y condiciones</a>
      <a href="${SITE}/#" style="font-family:${NU};font-size:12px;font-weight:600;color:rgba(255,255,255,.85);text-decoration:none;padding:0 10px;">Aviso de privacidad</a>
    </td></tr>
    <tr><td align="center" style="padding:16px 32px 6px;">
      <p style="margin:0;font-family:${NU};font-size:11px;color:rgba(255,255,255,.55);line-height:1.6;"><b style="color:rgba(255,255,255,.75);">Un producto de PRESTALANA SA de CV.</b><br />Blv. Adolfo López Mateos #1348, Torre Altum, 3er piso, Col. Atlamaya, CDMX, México, 01760</p>
    </td></tr>
    <tr><td align="center" style="padding:6px 32px 24px;">
      <p style="margin:0;font-family:${NU};font-size:11px;color:rgba(255,255,255,.45);line-height:1.6;">Recibiste este correo porque solicitaste una cotización en Ataskate.com.mx.<br /><a href="${SITE}/#" style="color:rgba(255,255,255,.65);text-decoration:underline;">Administrar notificaciones</a> &nbsp;·&nbsp; <a href="${SITE}/#" style="color:rgba(255,255,255,.65);text-decoration:underline;">Darme de baja</a></p>
    </td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:12px;"></td></tr></table>
  </td></tr></table>
  </body></html>`;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const para = String(d.para || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return json({ ok: false, error: 'Correo inválido' }, 400);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ ok: true, simulado: true });

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Ataskate <onboarding@resend.dev>',
      to: [para],
      subject: 'Tu cotización Ataskate — ' + mxn(d.recibe || d.total) + ' aprox.',
      html: plantilla(d),
    }),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) return json({ ok: false, error: res.message || ('Resend ' + r.status) }, 502);
  return json({ ok: true, id: res.id });
};

export const config = { path: '/api/enviar-cotizacion' };
