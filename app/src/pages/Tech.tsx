import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { listenRdvs, saveRapport, newId, todayStr } from '../lib/db'
import { getSession } from '../lib/session'
import { notify } from '../components/Notif'
import type { Rdv, Rapport, InterventionType } from '../types'
import { INTERVENTION_CONFIG } from '../types'

const MODES_ENC = ['Espèces', 'CB', 'Chèque', 'Virement', 'Mandant / Tiers payant']

export default function Tech() {
  const [rdvs, setRdvs] = useState<Rdv[]>([])
  const [selectedRdv, setSelectedRdv] = useState<Rdv | null>(null)
  const [showForm, setShowForm] = useState(false)
  const user = getSession()

  useEffect(() => {
    const unsub = listenRdvs((all) => {
      const mine = all.filter((r) =>
        r.technicienId === user?.id &&
        r.date === todayStr() &&
        r.statut !== 'Annule' &&
        r.statut !== 'Termine'
      )
      setRdvs(mine)
    })
    return unsub
  }, [user?.id])

  if (showForm && selectedRdv) {
    return <RapportForm rdv={selectedRdv} onDone={() => { setShowForm(false); setSelectedRdv(null) }} />
  }

  return (
    <Layout title="Mes interventions" subtitle={`${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
      {rdvs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">✅</div>
          <div className="empty-title">Aucune intervention aujourd'hui</div>
          <div className="empty-sub">Vos interventions assignées apparaîtront ici</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rdvs.map((rdv) => {
            const cfg = INTERVENTION_CONFIG[rdv.type]
            return (
              <div key={rdv.id} className="card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#0d2d52' }}>{rdv.clientNom}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{rdv.type}</div>
                    </div>
                    {rdv.urgence && (
                      <span className="badge badge-red" style={{ marginLeft: 'auto' }}>🚨 URGENT</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#475569', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span>🕐 {rdv.heure}</span>
                    <span>📍 {rdv.adresse}</span>
                    {rdv.clientTel && <a href={`tel:${rdv.clientTel}`} style={{ color: '#0d2d52', fontWeight: 600 }}>📞 {rdv.clientTel}</a>}
                    {rdv.mandant && <span>🏢 {rdv.mandant}</span>}
                  </div>

                  {rdv.notes && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#475569', marginBottom: 12 }}>
                      💬 {rdv.notes}
                    </div>
                  )}

                  <button
                    className="btn btn-accent btn-full"
                    onClick={() => { setSelectedRdv(rdv); setShowForm(true) }}
                  >
                    📝 Saisir mon rapport d'intervention
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

// ── FORMULAIRE RAPPORT ──
function RapportForm({ rdv, onDone }: { rdv: Rdv; onDone: () => void }) {
  const user = getSession()
  const cfg = INTERVENTION_CONFIG[rdv.type]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  const [form, setForm] = useState({
    heureDebut: rdv.heure,
    heureFin: '',
    description: '',
    montantFinal: 0,
    modeEncaissement: 'CB',
    satisfaction: 5,
    retourRequis: 'Non',
  })
  const [pieces, setPieces] = useState<string[]>([])
  const [pieceInput, setPieceInput] = useState('')
  const [piecesNotes, setPiecesNotes] = useState('')
  const [ventes, setVentes] = useState<{ label: string; prixVente: number }[]>([])
  const [venteLabel, setVenteLabel] = useState('')
  const [ventePrix, setVentePrix] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1) // 1=infos, 2=travaux, 3=financier, 4=signature

  const setF = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  function addPiece() {
    if (!pieceInput.trim()) return
    setPieces((p) => [...p, pieceInput.trim()])
    setPieceInput('')
  }

  function addVente() {
    if (!venteLabel.trim()) return
    setVentes((v) => [...v, { label: venteLabel.trim(), prixVente: Number(ventePrix) || 0 }])
    setVenteLabel(''); setVentePrix('')
  }

  // Signature pad
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    setDrawing(true)
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height))
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0d2d52'
    ctx.lineTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height))
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }
  function clearSig() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function submit() {
    if (!form.description.trim()) { notify('Description des travaux requise', 'error'); return }
    setSaving(true)

    let signature: string | undefined
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const hasData = Array.from(imageData.data).some((v, i) => i % 4 !== 3 && v !== 0)
      if (hasData) signature = canvas.toDataURL('image/png')
    }

    const rapport: Rapport = {
      id: newId(),
      rdvId: rdv.id,
      technicienId: user!.id,
      technicienNom: user!.nom,
      clientNom: rdv.clientNom,
      clientTel: rdv.clientTel,
      adresse: rdv.adresse,
      type: rdv.type as InterventionType,
      date: todayStr(),
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      description: form.description,
      pieces,
      piecesNotes,
      ventes,
      montantFinal: Number(form.montantFinal) || 0,
      modeEncaissement: form.modeEncaissement,
      signature,
      photosAvant: [],
      photosApres: [],
      satisfaction: form.satisfaction,
      retourRequis: form.retourRequis,
      mandant: rdv.mandant,
      statut: 'En attente validation',
      soumisLe: new Date().toISOString(),
    }

    await saveRapport(rapport)
    notify('✅ Rapport envoyé avec succès !', 'success')
    onDone()
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: '#0d2d52',
        color: '#fff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onDone}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}
        >
          ← Retour
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{rdv.clientNom}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{cfg.icon} {rdv.type} · {rdv.adresse}</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 20px', display: 'flex', gap: 0 }}>
        {[['1', 'Infos'], ['2', 'Travaux'], ['3', 'Financier'], ['4', 'Signature']].map(([n, label]) => (
          <button
            key={n}
            onClick={() => setStep(Number(n))}
            style={{
              flex: 1,
              padding: '12px 4px',
              border: 'none',
              borderBottom: `3px solid ${step === Number(n) ? '#0d2d52' : 'transparent'}`,
              background: 'none',
              fontSize: 11,
              fontWeight: step === Number(n) ? 700 : 500,
              color: step === Number(n) ? '#0d2d52' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 2 }}>{n === '1' ? '📋' : n === '2' ? '🔧' : n === '3' ? '💶' : '🖊'}</div>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* ÉTAPE 1 — Informations */}
        {step === 1 && (
          <div>
            {/* Procédure pré-remplie */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                ✅ Procédure standard — {rdv.type}
              </div>
              {cfg.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 13, color: '#166534', alignItems: 'flex-start' }}>
                  <span style={{
                    background: '#3a8c30', color: '#fff', borderRadius: '50%',
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  {s}
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Normes : {cfg.normes} · Garantie : {cfg.garantie}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Heure début</label>
                <input className="form-control" type="time" value={form.heureDebut} onChange={(e) => setF('heureDebut', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure fin</label>
                <input className="form-control" type="time" value={form.heureFin} onChange={(e) => setF('heureFin', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Retour requis ?</label>
              <select className="form-control" value={form.retourRequis} onChange={(e) => setF('retourRequis', e.target.value)}>
                {['Non', 'Oui — devis à envoyer', 'Oui — pièce à commander', 'Oui — 2e passage nécessaire'].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary btn-full" onClick={() => setStep(2)} style={{ marginTop: 8 }}>
              Étape suivante — Travaux réalisés →
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — Travaux */}
        {step === 2 && (
          <div>
            <div className="form-group">
              <label className="form-label">Description des travaux réalisés *</label>
              <textarea
                className="form-control"
                rows={6}
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                placeholder="Décrivez précisément les travaux effectués, le constat initial, les solutions apportées…"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pièces & fournitures utilisées</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="form-control"
                  value={pieceInput}
                  onChange={(e) => setPieceInput(e.target.value)}
                  placeholder="Ex : Joint fibre 20mm"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPiece())}
                />
                <button className="btn btn-ghost btn-sm" type="button" onClick={addPiece} style={{ flexShrink: 0 }}>
                  + Ajouter
                </button>
              </div>
              {pieces.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '5px 10px', marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#c2410c', fontWeight: 600 }}>🔩 {p}</span>
                  <button onClick={() => setPieces((pp) => pp.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
                </div>
              ))}
              <textarea
                className="form-control"
                rows={2}
                style={{ marginTop: 8 }}
                value={piecesNotes}
                onChange={(e) => setPiecesNotes(e.target.value)}
                placeholder="Notes sur les pièces (fournisseur, référence…)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prestations / ventes réalisées</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="form-control"
                  value={venteLabel}
                  onChange={(e) => setVenteLabel(e.target.value)}
                  placeholder="Libellé prestation"
                />
                <input
                  className="form-control"
                  type="number"
                  value={ventePrix}
                  onChange={(e) => setVentePrix(e.target.value)}
                  placeholder="Prix €"
                  style={{ width: 90, flexShrink: 0 }}
                />
                <button className="btn btn-ghost btn-sm" type="button" onClick={addVente} style={{ flexShrink: 0 }}>
                  + Ajouter
                </button>
              </div>
              {ventes.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 10px', marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#15803d', fontWeight: 600 }}>💼 {v.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{v.prixVente > 0 ? v.prixVente + ' €' : '—'}</span>
                  <button onClick={() => setVentes((vv) => vv.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Retour</button>
              <button className="btn btn-primary btn-full" onClick={() => setStep(3)}>Étape suivante — Financier →</button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — Financier */}
        {step === 3 && (
          <div>
            <div className="form-group">
              <label className="form-label">Montant total TTC (€)</label>
              <input
                className="form-control"
                type="number"
                value={form.montantFinal || ''}
                onChange={(e) => setF('montantFinal', Number(e.target.value))}
                placeholder="0.00"
                style={{ fontSize: 22, fontWeight: 700, color: '#0d2d52' }}
              />
            </div>

            {form.montantFinal > 0 && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#64748b' }}>
                  <span>Montant HT</span>
                  <span>{(form.montantFinal / 1.2).toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#64748b' }}>
                  <span>TVA 20%</span>
                  <span>{(form.montantFinal - form.montantFinal / 1.2).toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#0d2d52', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                  <span>TOTAL TTC</span>
                  <span style={{ color: '#3a8c30' }}>{Number(form.montantFinal).toFixed(2)} €</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Mode d'encaissement</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MODES_ENC.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setF('modeEncaissement', m)}
                    style={{
                      padding: '10px 12px',
                      border: `2px solid ${form.modeEncaissement === m ? '#0d2d52' : '#e2e8f0'}`,
                      borderRadius: 8,
                      background: form.modeEncaissement === m ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: form.modeEncaissement === m ? 700 : 500,
                      color: form.modeEncaissement === m ? '#0d2d52' : '#475569',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Satisfaction client ({form.satisfaction}/5)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setF('satisfaction', n)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: `2px solid ${form.satisfaction >= n ? '#f59e0b' : '#e2e8f0'}`,
                      borderRadius: 8,
                      background: form.satisfaction >= n ? '#fefce8' : '#fff',
                      cursor: 'pointer',
                      fontSize: 18,
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Retour</button>
              <button className="btn btn-primary btn-full" onClick={() => setStep(4)}>Étape suivante — Signature →</button>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 — Signature */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                🖊 Signature du client
              </div>
              <div style={{ border: '2px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc', touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={160}
                  style={{ width: '100%', height: 160, display: 'block', cursor: 'crosshair' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={clearSig}>
                🗑 Effacer la signature
              </button>
            </div>

            {/* Récapitulatif */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Récapitulatif
              </div>
              <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.8 }}>
                <div>👤 <strong>{rdv.clientNom}</strong> · {rdv.adresse}</div>
                <div>🔧 {rdv.type} · {form.heureDebut} → {form.heureFin}</div>
                {pieces.length > 0 && <div>🔩 {pieces.length} pièce(s) utilisée(s)</div>}
                <div>💶 <strong>{Number(form.montantFinal).toFixed(2)} €</strong> TTC · {form.modeEncaissement}</div>
                <div>⭐ Satisfaction : {form.satisfaction}/5</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Retour</button>
              <button
                className="btn btn-accent btn-full btn-lg"
                onClick={submit}
                disabled={saving}
              >
                {saving ? 'Envoi en cours…' : '✅ Envoyer le rapport'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
