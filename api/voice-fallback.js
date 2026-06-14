// Twilio fallback — si dispatch ne répond pas dans les 20 secondes
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.BASE_URL || '');

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Notre équipe n'est pas disponible pour le moment. Laissez-nous votre message et votre numéro de téléphone après le signal, nous vous rappellerons dans les plus brefs délais.</Say>
  <Record maxLength="180" recordingStatusCallback="${baseUrl}/api/transcribe" recordingStatusCallbackMethod="POST"/>
  <Say language="fr-FR" voice="alice">Merci de votre appel. Au revoir.</Say>
</Response>`);
};
