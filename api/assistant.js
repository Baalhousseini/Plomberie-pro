const DB_URL = 'https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app/greenflow';

async function callAPI(base, path, method, body) {
  const url = `${base}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  try { return await res.json(); } catch { return {}; }
}

async function executeTool(name, input, base) {
  try {
    switch (name) {
      case 'list_emails':
        return await callAPI(base, '/api/gmail', 'POST', { action: 'list', query: input.query || 'in:inbox', maxResults: input.maxResults || 10 });
      case 'read_email':
        return await callAPI(base, '/api/gmail', 'POST', { action: 'read', messageId: input.messageId });
      case 'send_email':
        return await callAPI(base, '/api/gmail', 'POST', { action: 'send', to: input.to, subject: input.subject, body: input.body });
      case 'list_calendar':
        return await callAPI(base, '/api/calendar', 'POST', { action: 'list', days: input.days || 7 });
      case 'create_calendar_event':
        return await callAPI(base, '/api/calendar', 'POST', { action: 'create', title: input.title, start: input.start, end: input.end, description: input.description, location: input.location });
      case 'delete_calendar_event':
        return await callAPI(base, '/api/calendar', 'POST', { action: 'delete', eventId: input.eventId });
      case 'send_sms':
        return await callAPI(base, '/api/sms', 'POST', { to: input.to, message: input.message });
      case 'create_rdv':
        // Save to Firebase
        const rdvsRes = await fetch(`${DB_URL}/pl_rdvs.json`);
        let rdvs = await rdvsRes.json() || [];
        if (!Array.isArray(rdvs)) rdvs = Object.values(rdvs);
        const rdv = { id: Date.now(), clientNom: input.clientNom, clientTel: input.clientTel || '', adresse: input.adresse || '', type: input.type, dateRdv: input.dateRdv, heureRdv: input.heureRdv, technicien: input.technicien || 'À planifier', prix: input.prix || 0, statut: 'Confirme', notes: input.notes || '', creePar: 'assistant-ia', creeAt: new Date().toISOString() };
        rdvs.push(rdv);
        await fetch(`${DB_URL}/pl_rdvs.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rdvs) });
        return { success: true, rdv };
      default:
        return { error: 'Outil inconnu: ' + name };
    }
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' });

  const { messages = [], context = {} } = req.body || {};
  const base = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const googleConnected = !!process.env.GOOGLE_REFRESH_TOKEN;

  const systemPrompt = `Tu es Alex, l'assistant IA personnel du patron de GreenFlow Technologies (plomberie, chauffage, sanitaire).

Aujourd'hui : ${today}

DONNÉES ENTREPRISE EN TEMPS RÉEL :
- RDV aujourd'hui : ${context.rdvsAujourdhui || 0} (${context.rdvsTermines || 0} terminés, ${context.rdvsAFaire || 0} à faire)
- Urgences actives : ${context.urgencesActives || 0}
- Techniciens disponibles : ${context.techsDispos || 'inconnu'}
- CA aujourd'hui : ${context.caJour || 0}€ | Ce mois : ${context.caMois || 0}€
- RDV à planifier : ${context.rdvsAPlanifier || 0}
- Contrats actifs : ${context.contrats || 0}
${context.recap ? '\nAGENDA DU JOUR :\n' + context.recap : ''}

CAPACITÉS :
${googleConnected ? '✅ Gmail connecté — tu peux lire, envoyer des emails' : '⚠️ Gmail non connecté — dis au patron de visiter /api/oauth-init'}
${googleConnected ? '✅ Google Calendar connecté — tu peux voir et créer des événements' : '⚠️ Google Calendar non connecté'}
✅ RDV app — créer des rendez-vous dans l'appli
✅ SMS — envoyer des SMS via Twilio

RÈGLES :
- Réponds en français, tutoie le patron, sois direct et concis
- Si on te demande de faire quelque chose, fais-le avec les outils — ne demande pas confirmation sauf si l'action est irréversible (supprimer, envoyer un email important)
- Pour les emails pro, signe toujours "GreenFlow Technologies"
- Tu peux enchaîner plusieurs outils dans une même réponse
- Si Gmail n'est pas connecté et qu'on te demande des emails, explique comment connecter`;

  const tools = [
    {
      name: 'list_emails',
      description: 'Liste les emails Gmail récents',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Filtre Gmail (ex: "is:unread", "from:client@mail.com", "subject:devis")' },
          maxResults: { type: 'number', description: 'Nombre max (défaut 10)' }
        }
      }
    },
    {
      name: 'read_email',
      description: 'Lit le contenu complet d\'un email',
      input_schema: {
        type: 'object',
        properties: { messageId: { type: 'string', description: 'ID de l\'email (issu de list_emails)' } },
        required: ['messageId']
      }
    },
    {
      name: 'send_email',
      description: 'Envoie un email depuis le compte Gmail pro',
      input_schema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Adresse email destinataire' },
          subject: { type: 'string', description: 'Objet de l\'email' },
          body: { type: 'string', description: 'Corps de l\'email (texte)' }
        },
        required: ['to', 'subject', 'body']
      }
    },
    {
      name: 'list_calendar',
      description: 'Liste les événements Google Calendar à venir',
      input_schema: {
        type: 'object',
        properties: { days: { type: 'number', description: 'Nombre de jours à afficher (défaut 7)' } }
      }
    },
    {
      name: 'create_calendar_event',
      description: 'Crée un événement dans Google Calendar (perso et/ou pro)',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          start: { type: 'string', description: 'Format ISO: 2025-06-15T10:00:00' },
          end: { type: 'string', description: 'Format ISO: 2025-06-15T11:00:00' },
          description: { type: 'string' },
          location: { type: 'string' }
        },
        required: ['title', 'start', 'end']
      }
    },
    {
      name: 'delete_calendar_event',
      description: 'Supprime un événement Google Calendar',
      input_schema: {
        type: 'object',
        properties: { eventId: { type: 'string', description: 'ID de l\'événement (issu de list_calendar)' } },
        required: ['eventId']
      }
    },
    {
      name: 'create_rdv',
      description: 'Crée un rendez-vous dans l\'application GreenFlow',
      input_schema: {
        type: 'object',
        properties: {
          clientNom: { type: 'string' },
          clientTel: { type: 'string' },
          adresse: { type: 'string' },
          type: { type: 'string', description: 'Type intervention (Fuite, Entretien chaudière, Urgence...)' },
          dateRdv: { type: 'string', description: 'Format YYYY-MM-DD' },
          heureRdv: { type: 'string', description: 'Format HH:MM' },
          technicien: { type: 'string' },
          prix: { type: 'number' },
          notes: { type: 'string' }
        },
        required: ['clientNom', 'type', 'dateRdv', 'heureRdv']
      }
    },
    {
      name: 'send_sms',
      description: 'Envoie un SMS',
      input_schema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Numéro format +33XXXXXXXXX' },
          message: { type: 'string', description: 'Texte du SMS (max 160 caractères)' }
        },
        required: ['to', 'message']
      }
    }
  ];

  try {
    let allMessages = [...messages];
    let finalContent = null;
    const allToolResults = [];
    let iterations = 0;

    // Boucle tool-use complète
    while (iterations++ < 6) {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: systemPrompt, messages: allMessages, tools })
      });

      const data = await claudeRes.json();
      if (!claudeRes.ok) return res.status(500).json({ error: data.error?.message || 'Erreur Claude' });

      if (data.stop_reason !== 'tool_use') {
        finalContent = data.content;
        break;
      }

      // Exécuter les outils
      const toolResultBlocks = [];
      for (const block of data.content) {
        if (block.type !== 'tool_use') continue;
        const result = await executeTool(block.name, block.input, base);
        allToolResults.push({ tool: block.name, input: block.input, result });
        toolResultBlocks.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }

      allMessages = [
        ...allMessages,
        { role: 'assistant', content: data.content },
        { role: 'user', content: toolResultBlocks }
      ];
    }

    const text = (finalContent || []).filter(b => b.type === 'text').map(b => b.text).join('');

    // Extraire les RDVs créés pour le client
    const createdRdvs = allToolResults.filter(r => r.tool === 'create_rdv' && r.result?.success).map(r => r.result.rdv);
    const sentSMS = allToolResults.filter(r => r.tool === 'send_sms').map(r => ({ to: r.input.to, message: r.input.message }));
    const sentEmails = allToolResults.filter(r => r.tool === 'send_email' && r.result?.success).map(r => ({ to: r.input.to, subject: r.input.subject }));

    res.status(200).json({
      content: finalContent || [{ type: 'text', text }],
      toolResults: allToolResults,
      createdRdvs,
      sentSMS,
      sentEmails
    });
  } catch (err) {
    console.error('[assistant]', err);
    res.status(500).json({ error: err.message });
  }
};
