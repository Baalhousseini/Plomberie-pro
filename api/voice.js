// Twilio Voice webhook — répond aux appels entrants
// Configure dans Twilio Console → Phone Numbers → Voice webhook URL
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const dispatchPhone = process.env.DISPATCH_PHONE || '';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.BASE_URL || '');

  if (!dispatchPhone) {
    // Pas de numéro dispatch configuré → messagerie directe
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Bonjour, vous avez bien joint GreenFlow Technologies. Veuillez laisser votre message après le signal, nous vous rappellerons rapidement.</Say>
  <Record maxLength="180" recordingStatusCallback="${baseUrl}/api/transcribe" recordingStatusCallbackMethod="POST"/>
  <Say language="fr-FR" voice="alice">Merci, au revoir.</Say>
</Response>`);
  }

  // Transfère vers dispatch + enregistre la conversation
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer"
        recordingStatusCallback="${baseUrl}/api/transcribe"
        recordingStatusCallbackMethod="POST"
        timeout="20"
        action="${baseUrl}/api/voice-fallback"
        method="POST">
    <Number>${dispatchPhone}</Number>
  </Dial>
</Response>`);
};
