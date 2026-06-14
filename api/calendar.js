async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed');
  return data.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getAccessToken();
    const { action, days, title, start, end, description, location, eventId, calendarId } = req.body || req.query || {};
    const cal = calendarId || 'primary';

    // LIST events
    if (action === 'list' || req.method === 'GET') {
      const now = new Date().toISOString();
      const until = new Date(Date.now() + (parseInt(days) || 7) * 86400000).toISOString();
      const listRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events?timeMin=${now}&timeMax=${until}&singleEvents=true&orderBy=startTime&maxResults=20`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await listRes.json();
      const events = (data.items || []).map(e => ({
        id: e.id,
        title: e.summary || '(sans titre)',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location || '',
        description: (e.description || '').substring(0, 200),
        allDay: !!e.start?.date
      }));
      return res.status(200).json({ events });
    }

    // CREATE event
    if (action === 'create' && req.method === 'POST') {
      if (!title || !start || !end) return res.status(400).json({ error: 'title, start, end requis' });
      const event = {
        summary: title,
        description: description || '',
        location: location || '',
        start: start.includes('T') ? { dateTime: start, timeZone: 'Europe/Paris' } : { date: start },
        end: end.includes('T') ? { dateTime: end, timeZone: 'Europe/Paris' } : { date: end }
      };
      const createRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event) }
      );
      const created = await createRes.json();
      return res.status(200).json({ success: !created.error, eventId: created.id, link: created.htmlLink, error: created.error?.message });
    }

    // DELETE event
    if (action === 'delete' && eventId) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events/${eventId}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      );
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Action inconnue. Utilise: list, create, delete' });
  } catch (err) {
    console.error('[calendar]', err);
    if (err.message.includes('Token refresh')) {
      return res.status(401).json({ error: 'Google Calendar non connecté. Visite /api/oauth-init.' });
    }
    res.status(500).json({ error: err.message });
  }
};
