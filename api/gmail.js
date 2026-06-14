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
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  return data.access_token;
}

function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function getEmailBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) return decodeBase64(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) return decodeBase64(part.body.data);
    }
    for (const part of payload.parts) {
      const body = getEmailBody(part);
      if (body) return body;
    }
  }
  return '';
}

function getHeader(headers, name) {
  const h = (headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getAccessToken();
    const { action, messageId, to, subject, body, query, maxResults } = req.body || req.query || {};

    // LIST emails
    if (action === 'list' || req.method === 'GET') {
      const q = query || 'in:inbox';
      const max = Math.min(parseInt(maxResults) || 10, 20);
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      const messages = listData.messages || [];

      const emails = await Promise.all(messages.slice(0, 10).map(async m => {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const msg = await msgRes.json();
        return {
          id: m.id,
          from: getHeader(msg.payload?.headers, 'From'),
          subject: getHeader(msg.payload?.headers, 'Subject'),
          date: getHeader(msg.payload?.headers, 'Date'),
          snippet: msg.snippet || '',
          unread: (msg.labelIds || []).includes('UNREAD')
        };
      }));

      return res.status(200).json({ emails });
    }

    // READ one email
    if (action === 'read' && messageId) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const msg = await msgRes.json();
      const emailBody = getEmailBody(msg.payload);
      // Mark as read
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
      });
      return res.status(200).json({
        id: messageId,
        from: getHeader(msg.payload?.headers, 'From'),
        to: getHeader(msg.payload?.headers, 'To'),
        subject: getHeader(msg.payload?.headers, 'Subject'),
        date: getHeader(msg.payload?.headers, 'Date'),
        body: emailBody.substring(0, 3000)
      });
    }

    // SEND email
    if (action === 'send' && req.method === 'POST') {
      if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body requis' });
      const profile = await (await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { 'Authorization': `Bearer ${token}` } })).json();
      const fromEmail = profile.emailAddress || '';
      const raw = Buffer.from(
        `From: GreenFlow Technologies <${fromEmail}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
      ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
      });
      const sent = await sendRes.json();
      return res.status(200).json({ success: !sent.error, messageId: sent.id, error: sent.error?.message });
    }

    res.status(400).json({ error: 'Action inconnue. Utilise: list, read, send' });
  } catch (err) {
    console.error('[gmail]', err);
    if (err.message.includes('Token refresh')) {
      return res.status(401).json({ error: 'Gmail non connecté. Visite /api/oauth-init pour autoriser.' });
    }
    res.status(500).json({ error: err.message });
  }
};
