const DB_URL = 'https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app/greenflow/pl_appels';

async function transcribeWithDeepgram(recordingUrl) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return '';
  const res = await fetch('https://api.deepgram.com/v1/listen?language=fr&model=nova-2&punctuate=true&diarize=true', {
    method: 'POST',
    headers: { 'Authorization': `Token ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: recordingUrl })
  });
  const data = await res.json();
  return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

async function generateMemo(transcript, callInfo) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !transcript) return '';
  const context = `Appel ${callInfo.direction === 'inbound' ? 'entrant' : 'sortant'} · Agent: ${callInfo.agent} · Client: ${callInfo.clientNom} (${callInfo.clientTel}) · Durée: ${Math.round(callInfo.duration / 60)}min`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `Société de plomberie. Génère un mémo court (4-5 lignes max) de cet appel.\n\nContexte: ${context}\n\nTranscription:\n${transcript}\n\nFormat souhaité:\n🔧 Problème: [problème signalé]\n✅ Action: [action prise ou décision]\n📋 Suivi: [suivi nécessaire ou RDV]\n⚠️ Priorité: [Urgent / Normal / Faible]`
      }]
    })
  });
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

async function readCurrentAppels() {
  try {
    const res = await fetch(`${DB_URL}.json`);
    const data = await res.json();
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
  } catch (e) {
    return [];
  }
}

async function saveAppel(appel) {
  const appels = await readCurrentAppels();
  appels.unshift(appel);
  const trimmed = appels.slice(0, 500);
  await fetch(`${DB_URL}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trimmed)
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const event = req.body;

    if (event.event !== 'call.ended') {
      return res.status(200).json({ ok: true, skipped: event.event });
    }

    const call = event.data || {};
    const recordingUrl = call.recording;

    const callInfo = {
      aircallId: call.id || '',
      direction: call.direction || 'inbound',
      duration: call.duration || 0,
      agent: call.user?.name || 'Dispatch',
      clientTel: call.contact?.phone_number || '',
      clientNom: call.contact?.name || 'Inconnu',
      date: new Date().toISOString().split('T')[0],
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    let transcript = '';
    let memo = '';

    if (recordingUrl) {
      [transcript, ] = await Promise.all([
        transcribeWithDeepgram(recordingUrl),
        Promise.resolve()
      ]);
      memo = await generateMemo(transcript, callInfo);
    }

    const appel = {
      id: Date.now(),
      ...callInfo,
      transcript,
      memo,
      recordingUrl: recordingUrl || '',
      // compat champs dispatch manual
      tel: callInfo.clientTel,
      nom: callInfo.clientNom,
      objet: 'aircall',
      note: memo || transcript.slice(0, 120),
      duree: Math.round(callInfo.duration / 60),
      resultat: 'aircall',
      operateur: callInfo.agent,
      source: 'aircall'
    };

    await saveAppel(appel);

    res.status(200).json({ ok: true, appelId: appel.id, hasMemo: !!memo });
  } catch (err) {
    console.error('[transcribe]', err);
    res.status(500).json({ error: err.message });
  }
};
