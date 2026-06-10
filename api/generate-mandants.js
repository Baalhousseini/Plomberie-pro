export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { action, zone, existing = [], mandant, context } = req.body || {};

  let prompt = '';

  if (action === 'email') {
    const { nom, type, service } = mandant || {};
    const { interventions, zones, anciennete, certifications } = context || {};
    prompt = `Tu es expert en développement commercial BtoB pour une société de dépannage plomberie en France.

Rédige un email de prospection professionnel et percutant pour contacter ${nom} (${type}${service ? ' — ' + service : ''}).

Contexte de notre société GreenFlow Technologies :
- Entreprise de dépannage plomberie/chauffage/sanitaire
- ${interventions || "plusieurs centaines"} d'interventions réalisées
- Zones couvertes : ${zones || "Île-de-France"}
- Ancienneté : ${anciennete || "3 ans"}
- Certifications : ${certifications || "RGE, RC Pro 2M€, Qualibat"}
- Disponibilité 24h/7j, délai d'intervention < 2h en IDF
- Techniciens certifiés GAZ et électricité

L'email doit :
1. Avoir un objet accrocheur sur la première ligne (préfixé "Objet : ")
2. Être adressé au bon interlocuteur selon le type de structure
3. Mettre en avant notre valeur ajoutée spécifique pour eux (volume, réactivité, garanties)
4. Proposer une action concrète (appel, rendez-vous)
5. Être concis (max 200 mots), professionnel, en français
6. Inclure une signature type

Réponds avec UNIQUEMENT le texte de l'email, aucun commentaire autour.`;
  } else {
    const existingList = existing.slice(0, 15).join(', ');
    prompt = `Tu es expert en développement commercial pour une société de dépannage plomberie en Île-de-France (zone : ${zone || 'Île-de-France'}).

Génère 8 prospects mandants potentiels qui sous-traitent régulièrement du dépannage plomberie/sanitaire/chauffage. Exclude ces entreprises déjà dans notre liste : ${existingList || 'aucune'}.

Focus sur : assureurs régionaux, gestionnaires de patrimoine, syndics locaux IDF, mutuelles, collectivités, sociétés de conciergerie haut de gamme, réseaux de maintenance.

Pour chaque prospect, réponds UNIQUEMENT avec ce tableau JSON valide :
[
  {
    "nom": "Nom exact de la société",
    "type": "Assureur|Syndic|Gestionnaire sinistres|Bailleur social|Plateforme|Autre",
    "secteur": "Région ou National",
    "site": "domaine.fr (sans https://)",
    "service": "Département ou service à contacter",
    "approche": "Stratégie concrète d'approche en 2-3 phrases",
    "potentiel": "Fort|Moyen|Faible"
  }
]

Réponds avec UNIQUEMENT le tableau JSON, aucun texte avant ou après.`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Claude API error', details: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (action === 'email') {
      return res.json({ email: text });
    } else {
      try {
        const parsed = JSON.parse(text);
        return res.json({ mandants: parsed });
      } catch (e) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            return res.json({ mandants: JSON.parse(match[0]) });
          } catch (e2) {}
        }
        return res.status(500).json({ error: 'Parse error', raw: text });
      }
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
