// Twilio SMS notifications for GreenFlow Technologies
// Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, type, data = {} } = req.body || {};
  if (!to || !type) return res.status(400).json({ error: 'Missing to or type' });

  const templates = {
    confirmation: `Bonjour ${data.clientNom || ''}, votre RDV GreenFlow est confirmé le ${data.date || ''} à ${data.heure || ''}. Adresse : ${data.adresse || ''}. Réf : ${data.ref || ''}. Annulation : 05 56 XX XX XX`,
    rappel_j1: `Rappel RDV GreenFlow demain ${data.date || ''} à ${data.heure || ''}. Technicien : ${data.technicien || 'à confirmer'}. Réf : ${data.ref || ''}. Infos : 05 56 XX XX XX`,
    en_route: `Votre technicien GreenFlow (${data.technicien || ''}) est en route. Arrivée estimée : ${data.eta || '30-45 min'}. Réf : ${data.ref || ''}`,
    termine: `Intervention GreenFlow terminée (Réf : ${data.ref || ''}). Montant : ${data.montant || ''}€. Merci de votre confiance ! Notez-nous : greenflow.fr/avis`,
    devis: `GreenFlow : votre devis (Réf : ${data.ref || ''}) de ${data.montant || ''}€ est prêt. Contactez-nous : 05 56 XX XX XX`,
    urgence_confirm: `⚡ GreenFlow URGENCE confirmée. Technicien dispatché. Arrivée < 4h. Réf : ${data.ref || ''}. Urgences 24h/24 : 05 56 XX XX XX`,
  };

  const body = templates[type];
  if (!body) return res.status(400).json({ error: `Unknown type: ${type}` });

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio env vars not configured — SMS not sent');
    return res.json({ success: false, message: 'SMS not configured', body });
  }

  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    let phone = String(to).replace(/[\s\-\.]/g, '');
    if (phone.startsWith('0')) phone = '+33' + phone.slice(1);
    if (!phone.startsWith('+')) phone = '+33' + phone;

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone,
    });

    res.json({ success: true, sid: message.sid, to: phone, type });
  } catch (err) {
    console.error('SMS error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
