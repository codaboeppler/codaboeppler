// GET /success?session_id=cs_XXXX
// Post-checkout page that shows the license key to the customer

module.exports = async function handler(req, res) {
  const { session_id } = req.query;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HU Generator PRO - Licencia Activada</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #1a1a2e; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .license-box {
      background: #f3f0ff;
      border: 2px dashed #7c3aed;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .license-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7c3aed;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .license-key {
      font-size: 24px;
      font-family: 'SF Mono', monospace;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: 2px;
    }
    .copy-btn {
      background: #7c3aed;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 12px;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: #6d28d9; transform: translateY(-1px); }
    .steps {
      text-align: left;
      margin-top: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .steps h3 { font-size: 13px; margin-bottom: 10px; color: #333; }
    .steps ol { padding-left: 20px; }
    .steps li {
      font-size: 12px;
      color: #666;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .steps li strong { color: #333; }
    .loading { color: #999; font-size: 14px; }
    .error { color: #dc2626; font-size: 13px; margin-top: 12px; }
    .email-note { font-size: 11px; color: #999; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#127881;</div>
    <h1>Bienvenido a PRO!</h1>
    <p class="subtitle">Tu pago fue exitoso. Aqui esta tu licencia.</p>

    <div class="license-box">
      <div class="license-label">Tu License Key</div>
      <div class="license-key" id="licenseKey">
        <span class="loading">Generando licencia...</span>
      </div>
      <button class="copy-btn" id="copyBtn" style="display:none;">Copiar License Key</button>
    </div>

    <p class="email-note" id="emailNote"></p>
    <p class="error" id="errorMsg" style="display:none;"></p>

    <div class="steps">
      <h3>Como activar en Figma:</h3>
      <ol>
        <li>Abre el plugin <strong>HU Generator</strong> en Figma</li>
        <li>Ve a la pestana <strong>"Licencia"</strong></li>
        <li>Pega tu License Key y click en <strong>"Activar licencia"</strong></li>
        <li>Listo! Ya tienes acceso a todas las funciones PRO</li>
      </ol>
    </div>
  </div>

  <script>
    const sessionId = '${session_id || ''}';
    let attempts = 0;
    const maxAttempts = 10;

    async function fetchLicense() {
      if (!sessionId) {
        document.getElementById('licenseKey').textContent = 'Error: no session ID';
        return;
      }

      try {
        const resp = await fetch('/api/license?session_id=' + sessionId);
        const data = await resp.json();

        if (data.ready && data.license_key) {
          document.getElementById('licenseKey').textContent = data.license_key;
          document.getElementById('copyBtn').style.display = 'inline-block';
          if (data.email) {
            document.getElementById('emailNote').textContent =
              'Tambien enviamos la licencia a: ' + data.email;
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(fetchLicense, 2000);
        } else {
          document.getElementById('errorMsg').textContent =
            'La licencia esta tardando en generarse. Revisa tu email o contacta soporte.';
          document.getElementById('errorMsg').style.display = 'block';
        }
      } catch (err) {
        document.getElementById('errorMsg').textContent = 'Error: ' + err.message;
        document.getElementById('errorMsg').style.display = 'block';
      }
    }

    document.getElementById('copyBtn').addEventListener('click', () => {
      const key = document.getElementById('licenseKey').textContent;
      navigator.clipboard.writeText(key).then(() => {
        document.getElementById('copyBtn').textContent = 'Copiado!';
        setTimeout(() => {
          document.getElementById('copyBtn').textContent = 'Copiar License Key';
        }, 2000);
      });
    });

    fetchLicense();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
};
