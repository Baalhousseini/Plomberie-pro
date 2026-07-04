import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { listenRdvs, listenRapports, saveRdv, getUsers, newId, todayStr } from '../lib/db'
import { getSession } from '../lib/session'
import { notify } from '../components/Notif'
import type { Rdv, Rapport, User, InterventionType, RdvStatut } from '../types'
import { INTERVENTION_TYPES } from '../types'

const STATUT_BADGE: Record<RdvStatut, string> = {
  'A planifier': 'badge-gray',
  'Planifie': 'badge-blue',
  'En cours': 'badge-yellow',
  'Termine': 'badge-green',
  'Annule': 'badge-red',
}

const STATUT_LABEL: Record<RdvStatut, string> = {
  'A planifier': '⏳ À planifier',
  'Planifie': '📅 Planifié',
  'En cours': '🔧 En cours',
  'Termine': '✅ Terminé',
  'Annule': '❌ Annulé',
}

export default function Dispatch() {
  const [rdvs, setRdvs] = useState<Rdv[]>([])
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [techs, setTechs] = useState<User[]>([])
  const [filter, setFilter] = useState<'today' | 'all' | 'pending'>('today')
  const [showModal, setShowModal] = useState(false)
  const [selectedRdv, setSelectedRdv] = useState<Rdv | null>(null)
  const user = getSession()

  useEffect(() => {
    const unsub1 = listenRdvs(setRdvs)
    const unsub2 = listenRapports(setRapports)
    getUsers().then((all) => setTechs(all.filter((u) => u.role === 'tech' && u.actif)))
    return () => { unsub1(); unsub2() }
  }, [])

  const today = todayStr()
  const filtered = rdvs.filter((r) => {
    if (filter === 'today') return r.date === today && r.statut !== 'Annule'
    if (filter === 'pending') return r.statut === 'A planifier'
    return r.statut !== 'Annule'
  }).sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure))

  const rapportsAttente = rapports.filter((r) => r.statut === 'En attente validation')
  const todayDone = rdvs.filter((r) => r.date === today && r.statut === 'Termine').length
  const todayTotal = rdvs.filter((r) => r.date === today && r.statut !== 'Annule').length

  async function assignTech(rdvId: string, techId: string) {
    const rdv = rdvs.find((r) => r.id === rdvId)
    if (!rdv) return
    const tech = techs.find((t) => t.id === techId)
    const updated: Rdv = { ...rdv, technicienId: techId, technicienNom: tech?.nom, statut: 'Planifie' }
    await saveRdv(updated)
    notify('✅ Technicien assigné', 'success')
    setSelectedRdv(null)
  }

  return (
    <Layout
      title="Dispatch — Planning"
      subtitle={`${today} · ${todayTotal} interventions aujourd'hui`}
      actions={
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>
          ➕ Nouveau RDV
        </button>
      }
    >
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Aujourd'hui</div>
          <div className="stat-value">{todayTotal}</div>
          <div className="stat-sub">{todayDone} terminées</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">À planifier</div>
          <div className="stat-value stat-danger">{rdvs.filter((r) => r.statut === 'A planifier').length}</div>
          <div className="stat-sub">sans technicien</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rapports reçus</div>
          <div className="stat-value stat-accent">{rapportsAttente.length}</div>
          <div className="stat-sub">à valider</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cette semaine</div>
          <div className="stat-value">{rdvs.filter((r) => r.statut !== 'Annule').length}</div>
          <div className="stat-sub">interventions total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['today', 'all', 'pending'] as const).map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'today' ? "Aujourd'hui" : f === 'all' ? 'Toutes' : 'À planifier'}
            {f === 'pending' && rdvs.filter((r) => r.statut === 'A planifier').length > 0 &&
              <span className="nav-badge" style={{ marginLeft: 6 }}>
                {rdvs.filter((r) => r.statut === 'A planifier').length}
              </span>
            }
          </button>
        ))}
      </div>

      {/* Rapports en attente banner */}
      {rapportsAttente.length > 0 && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
        }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <span>
            <strong>{rapportsAttente.length} rapport(s)</strong> en attente de validation —{' '}
            à transmettre au patron ou valider ici
          </span>
        </div>
      )}

      {/* Liste RDVs */}
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📅</div>
          <div className="empty-title">Aucune intervention</div>
          <div className="empty-sub">
            {filter === 'today' ? "Pas d'interventions planifiées aujourd'hui" : 'Aucune intervention trouvée'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((rdv) => (
            <div
              key={rdv.id}
              className={`rdv-card ${rdv.urgence ? 'urgence' : rdv.statut === 'Planifie' ? 'planifie' : rdv.statut === 'En cours' ? 'en-cours' : rdv.statut === 'Termine' ? 'termine' : ''}`}
              onClick={() => setSelectedRdv(rdv)}
            >
              <div className="rdv-card-header">
                {rdv.urgence && <span style={{ color: '#dc2626', fontWeight: 800, fontSize: 12 }}>🚨 URGENT</span>}
                <div className="rdv-client">{rdv.clientNom}</div>
                <span className={`badge ${STATUT_BADGE[rdv.statut]} mobile-hide`} style={{ marginLeft: 'auto' }}>
                  {STATUT_LABEL[rdv.statut]}
                </span>
              </div>
              <div className="rdv-type" style={{ marginBottom: 8 }}>
                {rdv.type}
              </div>
              <div className="rdv-card-meta">
                <span className="rdv-meta-item">📅 {new Date(rdv.date).toLocaleDateString('fr-FR')}</span>
                <span className="rdv-meta-item">🕐 {rdv.heure}</span>
                <span className="rdv-meta-item">📍 {rdv.adresse}</span>
                {rdv.technicienNom
                  ? <span className="rdv-meta-item">👷 {rdv.technicienNom}</span>
                  : <span className="rdv-meta-item" style={{ color: '#dc2626' }}>⚠️ Pas de technicien</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal RDV Detail / Assign */}
      {selectedRdv && (
        <RdvDetailModal
          rdv={selectedRdv}
          techs={techs}
          onAssign={assignTech}
          onClose={() => setSelectedRdv(null)}
          onSave={async (updated) => { await saveRdv(updated); setSelectedRdv(null); notify('Intervention mise à jour', 'success') }}
        />
      )}

      {/* Modal Nouveau RDV */}
      {showModal && (
        <NouveauRdvModal
          techs={techs}
          onClose={() => setShowModal(false)}
          onSave={async (rdv) => { await saveRdv(rdv); setShowModal(false); notify('✅ RDV créé !', 'success') }}
        />
      )}
    </Layout>
  )
}

// ── MODAL DÉTAIL RDV ──
function RdvDetailModal({ rdv, techs, onAssign, onClose, onSave }: {
  rdv: Rdv
  techs: User[]
  onAssign: (rdvId: string, techId: string) => void
  onClose: () => void
  onSave: (rdv: Rdv) => Promise<void>
}) {
  const [techId, setTechId] = useState(rdv.technicienId || '')
  const [statut, setStatut] = useState<RdvStatut>(rdv.statut)
  const [notes, setNotes] = useState(rdv.notes || '')

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 18 }}>📋</span>
          <div className="modal-title">{rdv.clientNom} — {rdv.type}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>CLIENT</div>
              <div style={{ fontWeight: 600 }}>{rdv.clientNom}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>📞 {rdv.clientTel}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>📍 {rdv.adresse}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>INTERVENTION</div>
              <div style={{ fontWeight: 600 }}>{rdv.type}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {new Date(rdv.date).toLocaleDateString('fr-FR')} à {rdv.heure}
              </div>
              {rdv.mandant && <div style={{ color: '#64748b', fontSize: 13 }}>Mandant : {rdv.mandant}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assigner un technicien</label>
            <select className="form-control" value={techId} onChange={(e) => setTechId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Statut</label>
            <select className="form-control" value={statut} onChange={(e) => setStatut(e.target.value as RdvStatut)}>
              {(['A planifier', 'Planifie', 'En cours', 'Termine', 'Annule'] as RdvStatut[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes internes</label>
            <textarea className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          {techId && <button className="btn btn-accent" onClick={() => onAssign(rdv.id, techId)}>👷 Assigner</button>}
          <button className="btn btn-primary" onClick={() => onSave({ ...rdv, statut, notes, technicienId: techId || rdv.technicienId, technicienNom: techs.find((t) => t.id === (techId || rdv.technicienId))?.nom })}>
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MODAL NOUVEAU RDV ──
function NouveauRdvModal({ techs, onClose, onSave }: {
  techs: User[]
  onClose: () => void
  onSave: (rdv: Rdv) => Promise<void>
}) {
  const user = getSession()
  const [form, setForm] = useState({
    clientNom: '', clientTel: '', adresse: '',
    type: "Fuite d'eau" as InterventionType,
    date: todayStr(), heure: '09:00',
    technicienId: '', mandant: '', notes: '', urgence: false,
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientNom || !form.adresse) { notify('Client et adresse requis', 'error'); return }
    setSaving(true)
    const tech = techs.find((t) => t.id === form.technicienId)
    const rdv: Rdv = {
      id: newId(),
      clientNom: form.clientNom,
      clientTel: form.clientTel,
      adresse: form.adresse,
      type: form.type,
      date: form.date,
      heure: form.heure,
      technicienId: form.technicienId || null,
      technicienNom: tech?.nom,
      statut: form.technicienId ? 'Planifie' : 'A planifier',
      mandant: form.mandant,
      notes: form.notes,
      urgence: form.urgence,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'unknown',
    }
    await onSave(rdv)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 18 }}>➕</span>
          <div className="modal-title">Nouveau rendez-vous</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#c2410c' }}>
                <input type="checkbox" checked={form.urgence} onChange={(e) => set('urgence', e.target.checked)} />
                🚨 Intervention URGENTE
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nom du client *</label>
                <input className="form-control" value={form.clientNom} onChange={(e) => set('clientNom', e.target.value)} placeholder="Jean Martin" required />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-control" value={form.clientTel} onChange={(e) => set('clientTel', e.target.value)} placeholder="06 12 34 56 78" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Adresse *</label>
              <input className="form-control" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} placeholder="12 rue de la Paix, 75001 Paris" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type d'intervention</label>
                <select className="form-control" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {INTERVENTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mandant / Assurance</label>
                <input className="form-control" value={form.mandant} onChange={(e) => set('mandant', e.target.value)} placeholder="AXA, MAIF, …" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-control" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input className="form-control" type="time" value={form.heure} onChange={(e) => set('heure', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Technicien</label>
              <select className="form-control" value={form.technicienId} onChange={(e) => set('technicienId', e.target.value)}>
                <option value="">— Non assigné —</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Informations complémentaires…" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? 'Création…' : '✅ Créer le RDV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
