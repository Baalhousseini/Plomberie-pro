// Étape 1 : sonne la secrétaire en premier
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
  const secretairePhone = process.env.SECRETAIRE_PHONE || '';

  if (!secretairePhone) {
    // Pas de secrétaire configurée → passe directement au dispatch
    return res.redirect(307, `${base}/api/voice-step2`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20"
        action="${base}/api/voice-step2"
        method="POST"
        record="record-from-answer"
        recordingStatusCallback="${base}/api/transcribe"
        recordingStatusCallbackMethod="POST"
        callerId="${process.env.TWILIO_FROM_NUMBER || ''}">
    <Number url="${base}/api/voice-whisper?role=secretaire">${secretairePhone}</Number>
  </Dial>
</Response>`);
};
