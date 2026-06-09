const twilio = require('twilio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Paramètres manquants' });

  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'DEMO') {
    console.log('[DEMO SMS] To:', to, '| Message:', message);
    return res.status(200).json({ success: true, demo: true });
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE || '+33XXXXXXXXX',
      to: to.startsWith('+') ? to : '+33' + to.replace(/^0/, '').replace(/\s/g, '')
    });
    return res.status(200).json({ success: true, sid: msg.sid });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
