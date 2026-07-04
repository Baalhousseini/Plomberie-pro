import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { listenRapports, listenFactures, saveRapport } from '../lib/db'
import { getSession } from '../lib/session'
import { notify } from '../components/Notif'
import type { Rapport, Facture } from '../types'

export default function Patron() {
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [selected, setSelected] = useState<Rapport | null>(null)
  const [tab, setTab] = useState<'validation' | 'dashboard'>('dashboard')
  const user = getSession()

  useEffect(() => {
    const u1 = listenRapports(setRapports)
    const u2 = listenFactures(setFactures)
    return () => { u1(); u2() }
  }, [])

  const aValider = rapports.filter((r) => r.statut === 'En attente validation')
  const valides = rapports.filter((r) => r.statut === 'Valide')
  const factures_total = factures.reduce((s, f) => s + f.montantTTC, 0)
  const factures_paye = factures.filter((f) => f.statut === 'Paye').reduce((s, f) => s + f.montantTTC, 0)

  async function valider(r: Rapport, commentaire: string) {
    await saveRapport({ ...r, statut: 'Valide', valideAt: new Date().toISOString(), valideBy: user?.nom, commentairePatron: commentaire })
    notify('✅ Rapport validé — transmis à la secrétaire', 'success')
    setSelected(null)
  }

  async function refuser(r: Rapport, raison: string) {
    await saveRapport({ ...r, statut: 'Refuse', commentairePatron: raison })
    notify('Rapport refusé', 'error')
    setSelected(null)
  }

  return (
    <Layout
      title="Espace patron"
      subtitle="Direction & validation"
      actions={
        aValider.length > 0 ? (
          <span className="badge badge-red" style={{ fontSize: 13, padding: '4px 12px' }}>
            {aValider.length} rapport(s) à valider
          </span>
        ) : undefined
      }
    >
      <div className="tabs">
        <button className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 Dashboard</button>
        <button className={`tab ${tab === 'validation' ? 'active' : ''}`} onClick={() => setTab('validation')}>
          ✅ Validation
          {aValider.length > 0 && <span className="nav-badge" style={{ marginLeft: 6 }}>{aValider.length}</span>}
        </button>
      </div>

      {tab === 'dashboard' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">À valider</div>
              <div className={`stat-value ${aValider.length > 0 ? 'stat-danger' : ''}`}>{aValider.length}</div>
              <div className="stat-sub">rapports en attente</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Validés</div>
              <div className="stat-value stat-accent">{valides.length}</div>
              <div className="stat-sub">transmis secrétaire</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CA facturé</div>
              <div className="stat-value">{factures_total.toFixed(0)}€</div>
              <div className="stat-sub">total émis</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Encaissé</div>
              <div className="stat-value stat-accent">{factures_paye.toFixed(0)}€</div>
              <div className="stat-sub">{factures.filter((f) => f.statut === 'Paye').length} factures payées</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span>📊</span>
              <div className="card-title">Dernières interventions</div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Technicien</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rapports.slice(0, 20).map((r) => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(r); setTab('validation') }}>
                      <td style={{ fontWeight: 600 }}>{r.clientNom}</td>
                      <td>{r.type}</td>
                      <td>{r.technicienNom}</td>
                      <td>{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                      <td style={{ fontWeight: 700, color: '#0d2d52' }}>{r.montantFinal.toFixed(2)} €</td>
                      <td><RapportBadge statut={r.statut} /></td>
                    </tr>
                  ))}
                  {rapports.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Aucun rapport</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'validation' && (
        <>
          {aValider.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✅</div>
              <div className="empty-title">Tout est à jour</div>
              <div className="empty-sub">Aucun rapport en attente de validation</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aValider.map((r) => (
                <div key={r.id} className="rap-card" onClick={() => setSelected(r)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0d2d52', flex: 1 }}>{r.clientNom}</div>
                    <span className="badge badge-yellow">⏳ À valider</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>🔧 {r.type}</span>
                    <span>👷 {r.technicienNom}</span>
                    <span>📅 {new Date(r.date).toLocaleDateString('fr-FR')}</span>
                    <span style={{ fontWeight: 700, color: '#0d2d52' }}>💶 {r.montantFinal.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <ValidationModal
          rapport={selected}
          onValider={valider}
          onRefuser={refuser}
          onClose={() => setSelected(null)}
        />
      )}
    </Layout>
  )
}

function RapportBadge({ statut }: { statut: Rapport['statut'] }) {
  const map: Record<string, string> = {
    'En attente validation': 'badge-yellow',
    'Valide': 'badge-green',
    'Refuse': 'badge-red',
    'Facture': 'badge-purple',
    'Paye': 'badge-blue',
  }
  return <span className={`badge ${map[statut] || 'badge-gray'}`}>{statut}</span>
}

function ValidationModal({ rapport: r, onValider, onRefuser, onClose }: {
  rapport: Rapport
  onValider: (r: Rapport, comment: string) => void
  onRefuser: (r: Rapport, raison: string) => void
  onClose: () => void
}) {
  const [comment, setComment] = useState('')
  const [view, setView] = useState<'detail' | 'refuse'>('detail')

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span>📋</span>
          <div className="modal-title">{r.clientNom} — {r.type}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Infos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              ['Client', `${r.clientNom} · ${r.clientTel}`],
              ['Adresse', r.adresse],
              ['Technicien', r.technicienNom],
              ['Date', new Date(r.date).toLocaleDateString('fr-FR') + ' · ' + r.heureDebut + ' → ' + r.heureFin],
              ['Montant TTC', r.montantFinal.toFixed(2) + ' €'],
              ['Encaissement', r.modeEncaissement],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: 13 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                <div style={{ fontWeight: 600, color: '#0d2d52' }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="divider" />

          {r.description && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Travaux réalisés</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                {r.description}
              </div>
            </div>
          )}

          {r.pieces.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Pièces utilisées</div>
              {r.pieces.map((p, i) => (
                <span key={i} className="badge badge-orange" style={{ marginRight: 6, marginBottom: 4 }}>🔩 {p}</span>
              ))}
            </div>
          )}

          {r.statut === 'En attente validation' && (
            <div style={{ marginTop: 16 }}>
              <label className="form-label">Commentaire (optionnel)</label>
              <textarea
                className="form-control"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Observations, remarques pour la secrétaire…"
              />
            </div>
          )}
        </div>
        {r.statut === 'En attente validation' && (
          <div className="modal-footer">
            <button className="btn btn-danger" onClick={() => onRefuser(r, comment)}>❌ Refuser</button>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn-accent" onClick={() => onValider(r, comment)}>✅ Valider → Secrétaire</button>
          </div>
        )}
        {r.statut !== 'En attente validation' && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
