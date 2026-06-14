// Étape 2 : Google redirige ici après autorisation
// Copie le refresh_token affiché dans Vercel → GOOGLE_REFRESH_TOKEN
module.exports = async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send('Pas de code reçu');

  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${base}/api/oauth-callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();

    if (tokens.error) return res.status(400).send('Erreur : ' + tokens.error_description);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>OAuth GreenFlow</title>
<style>body{font-family:sans-serif;max-width:600px;margin:60px auto;padding:20px;}
.box{background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin:16px 0;}
.token{background:#1e293b;color:#86efac;border-radius:8px;padding:14px;font-family:monospace;font-size:11px;word-break:break-all;margin:10px 0;}
button{background:#0d2d52;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;}</style>
</head><body>
<h2>✅ Autorisation réussie — GreenFlow AI</h2>
<div class="box">
  <strong>Étape finale :</strong> Copie ce token dans Vercel → Settings → Environment Variables → <code>GOOGLE_REFRESH_TOKEN</code>
  <div class="token" id="tok">${tokens.refresh_token || '⚠️ Pas de refresh_token — relance /api/oauth-init'}</div>
  <button onclick="navigator.clipboard.writeText('${tokens.refresh_token||''}').then(()=>alert('Copié !'))">📋 Copier</button>
</div>
<p style="color:#64748b;font-size:13px;">Après avoir collé dans Vercel et redéployé, l'assistant Alex peut lire et envoyer tes emails + gérer ton agenda.</p>
</body></html>`);
  } catch (err) {
    res.status(500).send('Erreur : ' + err.message);
  }
};
