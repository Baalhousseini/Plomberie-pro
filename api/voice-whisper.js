// Whisper : message dans l'oreille avant de décrocher
// Informe secrétaire/dispatch que c'est un appel pro + touches de transfert
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  const role = (req.query || {}).role || 'agent';
  const label = role === 'secretaire' ? 'Secrétaire' : 'Dispatch';

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">Appel GreenFlow entrant. Appuyez sur étoile un pour transférer au patron. Appuyez sur étoile deux pour transférer au dispatch. Décrochez pour répondre.</Say>
</Response>`);
};
