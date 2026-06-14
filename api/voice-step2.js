// Étape 2 : secrétaire n'a pas répondu → sonne le dispatch
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
  const dialStatus = (req.body || {}).DialCallStatus || '';
  const dispatchPhone = process.env.DISPATCH_PHONE || '';

  // Si secrétaire a répondu mais a raccroché (completed) → on ne redémarre pas
  if (dialStatus === 'completed') {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }

  if (!dispatchPhone) {
    return res.redirect(307, `${base}/api/voice-fallback`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20"
        action="${base}/api/voice-fallback"
        method="POST"
        record="record-from-answer"
        recordingStatusCallback="${base}/api/transcribe"
        recordingStatusCallbackMethod="POST"
        callerId="${process.env.TWILIO_FROM_NUMBER || ''}">
    <Number url="${base}/api/voice-whisper?role=dispatch">${dispatchPhone}</Number>
  </Dial>
</Response>`);
};
