const DB_URL = 'https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app/greenflow/pl_appels';

async function downloadRecording(recordingUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const url = recordingUrl.endsWith('.mp3') ? recordingUrl : recordingUrl + '.mp3';
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Recording fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function transcribeAudio(audioBuffer) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key || !audioBuffer) return '';
  const res = await fetch('https://api.deepgram.com/v1/listen?language=fr&model=nova-2&punctuate=true&diarize=true', {
    method: 'POST',
    headers: { 'Authorization': `Token ${key}`, 'Content-Type': 'audio/mpeg' },
    body: audioBuffer
  });
  const data = await res.json();
  return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

async function generateMemo(transcript, callInfo) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !transcript) return '';
  const context = `Appel ${callInfo.direction} · Client: ${callInfo.clientNom} (${callInfo.clientTel}) · Durée: ${Math.round(callInfo.duration / 60)}min`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `Société de plomberie. Génère un mémo court (4-5 lignes) de cet appel téléphonique.\n\nContexte: ${context}\n\nTranscription:\n${transcript}\n\nFormat:\n🔧 Problème: [problème signalé]\n✅ Action: [action prise]\n📋 Suivi: [suivi ou RDV à créer]\n⚠️ Priorité: [Urgent / Normal / Faible]`
      }]
    })
  });
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

async function getCallDetails(callSid) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !callSid) return {};
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  if (!res.ok) return {};
  return await res.json();
}

async function readCurrentAppels() {
  try {
    const res = await fetch(`${DB_URL}.json`);
    const data = await res.json();
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  } catch (e) { return []; }
}

async function saveAppel(appel) {
  const appels = await readCurrentAppels();
  appels.unshift(appel);
  await fetch(`${DB_URL}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appels.slice(0, 500))
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body || {};

    // Twilio sends form-encoded — check for Twilio fields
    const recordingUrl = body.RecordingUrl || body.recording || '';
    const callSid = body.CallSid || body.ParentCallSid || '';
    const recordingDuration = parseInt(body.RecordingDuration || '0');
    const callerFrom = body.From || body.Called || '';

    if (!recordingUrl) return res.status(200).json({ ok: true, skipped: 'no recording url' });

    // Get caller details from Twilio API
    const callData = await getCallDetails(callSid);
    const clientTel = callData.from || callerFrom || '';
    const direction = callData.direction === 'inbound' ? 'entrant' : 'sortant';

    const callInfo = {
      twilioSid: callSid,
      direction,
      duration: recordingDuration,
      agent: 'Dispatch',
      clientTel,
      clientNom: 'Inconnu',
      date: new Date().toISOString().split('T')[0],
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    // Download recording from Twilio (requires auth)
    let audioBuffer = null;
    try { audioBuffer = await downloadRecording(recordingUrl); } catch (e) {
      console.warn('[transcribe] recording download failed:', e.message);
    }

    const transcript = await transcribeAudio(audioBuffer);
    const memo = await generateMemo(transcript, callInfo);

    const appel = {
      id: Date.now(),
      ...callInfo,
      transcript,
      memo,
      recordingUrl: recordingUrl + '.mp3',
      // compat dispatch manual fields
      tel: clientTel,
      nom: callInfo.clientNom,
      objet: 'Appel Twilio',
      note: memo || transcript.slice(0, 120),
      duree: Math.round(recordingDuration / 60),
      resultat: 'aircall',
      operateur: callInfo.agent,
      source: 'twilio'
    };

    await saveAppel(appel);

    res.status(200).json({ ok: true, appelId: appel.id, hasMemo: !!memo });
  } catch (err) {
    console.error('[transcribe]', err);
    res.status(500).json({ error: err.message });
  }
};
