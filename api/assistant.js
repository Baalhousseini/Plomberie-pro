module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' });

  const { messages = [], context = {} } = req.body || {};

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const systemPrompt = `Tu es Alex, l'assistant IA personnel du patron de GreenFlow Technologies (société de plomberie, chauffage, sanitaire).

Aujourd'hui : ${today}

DONNÉES ENTREPRISE EN TEMPS RÉEL :
${context.rdvsAujourdhui !== undefined ? `- RDV aujourd'hui : ${context.rdvsAujourdhui} (${context.rdvsTermines || 0} terminés, ${context.rdvsAFaire || 0} à faire)` : ''}
${context.urgencesActives !== undefined ? `- Urgences actives : ${context.urgencesActives}` : ''}
${context.techsDispos !== undefined ? `- Techniciens disponibles : ${context.techsDispos}` : ''}
${context.caJour !== undefined ? `- CA aujourd'hui : ${context.caJour}€` : ''}
${context.caMois !== undefined ? `- CA ce mois : ${context.caMois}€` : ''}
${context.rdvsAPlanifier !== undefined ? `- RDV à planifier : ${context.rdvsAPlanifier}` : ''}
${context.contrats !== undefined ? `- Contrats d'entretien actifs : ${context.contrats}` : ''}
${context.clients !== undefined ? `- Clients en base : ${context.clients}` : ''}
${context.prochainRdv ? `- Prochain RDV : ${context.prochainRdv}` : ''}
${context.recap ? `\nRÉCAPI DU JOUR :\n${context.recap}` : ''}

TU PEUX :
1. Analyser et résumer la situation de l'entreprise
2. Rédiger des emails professionnels (devis, relance, confirmation, réclamation)
3. Créer des rendez-vous → outil create_rdv
4. Envoyer des SMS → outil send_sms
5. Donner des conseils business et commerciaux
6. Répondre à des questions sur les clients, RDV, chiffres

RÈGLES :
- Réponds toujours en français, tutoie le patron
- Sois concis et direct, maximum 3 paragraphes sauf si on te demande un email complet
- Pour les emails, utilise un format pro GreenFlow Technologies
- Tu as accès aux outils create_rdv et send_sms pour agir directement`;

  const tools = [
    {
      name: 'create_rdv',
      description: 'Crée un rendez-vous dans le planning de l\'application',
      input_schema: {
        type: 'object',
        properties: {
          clientNom: { type: 'string', description: 'Nom complet du client' },
          clientTel: { type: 'string', description: 'Numéro de téléphone' },
          adresse: { type: 'string', description: 'Adresse de l\'intervention' },
          type: { type: 'string', description: 'Type d\'intervention (ex: Fuite, Entretien chaudière...)' },
          dateRdv: { type: 'string', description: 'Date au format YYYY-MM-DD' },
          heureRdv: { type: 'string', description: 'Heure au format HH:MM' },
          technicien: { type: 'string', description: 'Nom du technicien assigné' },
          prix: { type: 'number', description: 'Prix en euros' },
          notes: { type: 'string', description: 'Notes additionnelles' }
        },
        required: ['clientNom', 'dateRdv', 'heureRdv', 'type']
      }
    },
    {
      name: 'send_sms',
      description: 'Envoie un SMS à un numéro de téléphone',
      input_schema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Numéro de téléphone (format +33XXXXXXXXX)' },
          message: { type: 'string', description: 'Contenu du SMS (max 160 caractères)' }
        },
        required: ['to', 'message']
      }
    }
  ];

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools
      })
    });

    const data = await claudeRes.json();
    if (!claudeRes.ok) return res.status(500).json({ error: data.error?.message || 'Erreur Claude' });

    // Handle tool calls
    const toolResults = [];
    for (const block of data.content || []) {
      if (block.type !== 'tool_use') continue;

      if (block.name === 'send_sms') {
        try {
          const baseUrl = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
          const smsRes = await fetch(`${baseUrl}/api/sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: block.input.to, message: block.input.message })
          });
          const smsData = await smsRes.json();
          toolResults.push({ tool: 'send_sms', success: smsData.success || smsData.demo, to: block.input.to, message: block.input.message });
        } catch (e) {
          toolResults.push({ tool: 'send_sms', success: false, error: e.message });
        }
      }

      if (block.name === 'create_rdv') {
        // Returned to client to save in localStorage
        toolResults.push({ tool: 'create_rdv', rdv: block.input });
      }
    }

    res.status(200).json({ content: data.content, toolResults, stopReason: data.stop_reason });
  } catch (err) {
    console.error('[assistant]', err);
    res.status(500).json({ error: err.message });
  }
};
