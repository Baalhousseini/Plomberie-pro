// Étape 1 (une seule fois) : visite https://[ton-domaine]/api/oauth-init
// pour autoriser l'agent à accéder à ton Gmail + Calendar
module.exports = async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;

  if (!clientId) {
    return res.status(500).send('GOOGLE_CLIENT_ID manquant dans les variables Vercel');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${base}/api/oauth-callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  res.redirect(302, url.toString());
};
