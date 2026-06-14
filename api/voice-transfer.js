// Transfert d'appel : appelé quand secrétaire/dispatch appuie *1 ou *2
// Note : nécessite que l'appel soit géré via <Gather> avec finishOnKey
// Ce endpoint reçoit les touches DTMF et redirige l'appel
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
  const body = req.body || {};
  const digits = body.Digits || '';
  const callSid = body.CallSid || '';

  // *1 = transférer au patron
  if (digits === '*1') {
    const patronPhone = process.env.PATRON_PHONE || '';
    if (!patronPhone) {
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Numéro patron non configuré.</Say>
</Response>`);
    }
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Transfert vers le patron en cours.</Say>
  <Dial record="record-from-answer"
        recordingStatusCallback="${base}/api/transcribe"
        recordingStatusCallbackMethod="POST">
    <Number>${patronPhone}</Number>
  </Dial>
</Response>`);
  }

  // *2 = transférer au dispatch
  if (digits === '*2') {
    const dispatchPhone = process.env.DISPATCH_PHONE || '';
    if (!dispatchPhone) {
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Numéro dispatch non configuré.</Say>
</Response>`);
    }
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Transfert vers le dispatch en cours.</Say>
  <Dial record="record-from-answer"
        recordingStatusCallback="${base}/api/transcribe"
        recordingStatusCallbackMethod="POST">
    <Number>${dispatchPhone}</Number>
  </Dial>
</Response>`);
  }

  // Autre touche → ignorer, continuer l'appel
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
};
