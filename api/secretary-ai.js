const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Tu es l'assistante juridique et RH de GreenFlow Technologies, entreprise de plomberie-chauffage en France visant 12M€ de CA, basée en Île-de-France.

Tu aides la secrétaire sur :
- Droit du travail français (Code du travail, jurisprudence courante)
- Convention collective nationale du Bâtiment : ouvriers IDCC 1596, ETAM IDCC 1597
- Procédures RH : embauche, sanctions, licenciement, rupture conventionnelle
- Calculs : congés payés, heures supplémentaires (majorations 25%/50%), indemnités
- Démarches : DPAE, URSSAF, CPAM, médecine du travail, France Travail
- Rédaction de courriers professionnels et documents RH
- Certifications artisans : Qualibat, RGE, habilitations gaz, certificats d'économie d'énergie
- Marchés assureurs : agrément prestataires AXA, Allianz, MAIF, conventions DARVA/IMH

Règles de réponse :
- Réponse en français, concise et pratique (pas de jargon inutile)
- Donner des exemples chiffrés quand c'est possible
- Si délais légaux → les mentionner explicitement
- Si la question touche au licenciement, AT grave ou litige : recommander avocat/expert-comptable
- Mentionner les formulaires Cerfa ou sites officiels quand pertinent`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, history } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Question requise' });

  try {
    const messages = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach(m => {
        if (m.role && m.content) messages.push({ role: m.role, content: m.content });
      });
    }
    messages.push({ role: 'user', content: question });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      messages,
    });

    res.json({ answer: response.content[0].text });
  } catch (err) {
    console.error('secretary-ai error:', err.message);
    res.status(500).json({ error: 'Erreur IA : ' + err.message });
  }
};
