// Étape 3 : personne n'a répondu → messagerie + alerte SMS au patron
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
  const body = req.body || {};
  const dialStatus = body.DialCallStatus || '';

  // Si dispatch a répondu et raccroché normalement → rien à faire
  if (dialStatus === 'completed') {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }

  // Alerter le patron par SMS
  const patronPhone = process.env.PATRON_PHONE || '';
  const callerFrom = body.From || body.Called || 'Inconnu';
  if (patronPhone && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        to: patronPhone,
        from: process.env.TWILIO_FROM_NUMBER,
        body: `⚠️ GreenFlow — Appel manqué de ${callerFrom}. Ni la secrétaire ni le dispatch n'ont répondu. Le client laisse un message.`
      });
    } catch (e) {
      console.warn('[voice-fallback] SMS patron failed:', e.message);
    }
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Bonjour, vous avez bien joint GreenFlow Technologies. Nos agents sont momentanément indisponibles. Merci de laisser votre nom, numéro de téléphone et l'objet de votre appel après le signal. Nous vous rappelons dans les plus brefs délais.</Say>
  <Record maxLength="180"
          recordingStatusCallback="${base}/api/transcribe"
          recordingStatusCallbackMethod="POST"
          transcribe="false"/>
  <Say language="fr-FR" voice="alice">Merci de votre message. Au revoir.</Say>
</Response>`);
};
