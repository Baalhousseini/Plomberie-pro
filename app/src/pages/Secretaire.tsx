import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { listenRapports, listenFactures, saveRapport, saveFacture, getFactures, newId, todayStr, nextRef } from '../lib/db'
import { notify } from '../components/Notif'
import type { Rapport, Facture } from '../types'
import { INTERVENTION_CONFIG } from '../types'

export default function Secretaire() {
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [tab, setTab] = useState<'rapports' | 'factures'>('rapports')
  const [selected, setSelected] = useState<Rapport | null>(null)

  useEffect(() => {
    const u1 = listenRapports(setRapports)
    const u2 = listenFactures(setFactures)
    return () => { u1(); u2() }
  }, [])

  const rapportsAFacturer = rapports.filter((r) => r.statut === 'Valide')
  const facturees = rapports.filter((r) => r.statut === 'Facture' || r.statut === 'Paye')
  const ca_total = factures.reduce((s, f) => s + f.montantTTC, 0)
  const ca_impaye = factures.filter((f) => f.statut === 'Impaye').reduce((s, f) => s + f.montantTTC, 0)

  async function facturer(r: Rapport) {
    const allFac = await getFactures()
    const ref = nextRef('FAC', allFac)
    const montantTTC = r.montantFinal
    const montantHT = Math.round((montantTTC / 1.2) * 100) / 100
    const tva = Math.round((montantTTC - montantHT) * 100) / 100

    const fac: Facture = {
      id: newId(),
      ref,
      rapportId: r.id,
      clientNom: r.clientNom,
      clientTel: r.clientTel,
      adresse: r.adresse,
      technicienNom: r.technicienNom,
      dateIntervention: r.date,
      dateFacture: todayStr(),
      montantHT,
      tva,
      montantTTC,
      description: r.description,
      pieces: r.pieces,
      ventes: r.ventes,
      statut: 'Impaye',
      modeEncaissement: r.modeEncaissement,
      createdAt: new Date().toISOString(),
    }

    await saveFacture(fac)
    await saveRapport({ ...r, statut: 'Facture', facturRef: ref })
    notify(`✅ Facture ${ref} créée !`, 'success')
    setSelected(null)
    genererPDF(fac, r)
  }

  async function marquerPaye(f: Facture) {
    await saveFacture({ ...f, statut: 'Paye' })
    notify('💶 Facture marquée payée', 'success')
  }

  return (
    <Layout title="Secrétariat" subtitle="Facturation & rapports">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">À facturer</div>
          <div className={`stat-value ${rapportsAFacturer.length > 0 ? 'stat-accent' : ''}`}>{rapportsAFacturer.length}</div>
          <div className="stat-sub">rapports validés</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CA émis</div>
          <div className="stat-value">{ca_total.toFixed(2)} €</div>
          <div className="stat-sub">{factures.length} factures</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Impayés</div>
          <div className={`stat-value ${ca_impaye > 0 ? 'stat-danger' : ''}`}>{ca_impaye.toFixed(2)} €</div>
          <div className="stat-sub">{factures.filter((f) => f.statut === 'Impaye').length} en attente</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Facturées</div>
          <div className="stat-value">{facturees.length}</div>
          <div className="stat-sub">interventions</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'rapports' ? 'active' : ''}`} onClick={() => setTab('rapports')}>
          📝 Rapports à facturer
          {rapportsAFacturer.length > 0 && <span className="nav-badge" style={{ marginLeft: 6 }}>{rapportsAFacturer.length}</span>}
        </button>
        <button className={`tab ${tab === 'factures' ? 'active' : ''}`} onClick={() => setTab('factures')}>
          🧾 Factures
        </button>
      </div>

      {tab === 'rapports' && (
        <>
          {rapportsAFacturer.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✅</div>
              <div className="empty-title">Aucun rapport à facturer</div>
              <div className="empty-sub">Les rapports validés par le patron apparaîtront ici</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rapportsAFacturer.map((r) => {
                const cfg = INTERVENTION_CONFIG[r.type]
                return (
                  <div key={r.id} className="rap-card" onClick={() => setSelected(r)} style={{ borderLeft: `4px solid ${cfg.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0d2d52', flex: 1 }}>{r.clientNom}</div>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#3a8c30' }}>{r.montantFinal.toFixed(2)} €</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{r.type}</span>
                      <span>👷 {r.technicienNom}</span>
                      <span>📅 {new Date(r.date).toLocaleDateString('fr-FR')}</span>
                      <span>💳 {r.modeEncaissement}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'factures' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>HT</th>
                  <th>TVA</th>
                  <th>TTC</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {factures.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Aucune facture</td></tr>
                )}
                {factures.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 700, color: '#0d2d52' }}>{f.ref}</td>
                    <td style={{ fontWeight: 600 }}>{f.clientNom}</td>
                    <td>{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</td>
                    <td>{f.montantHT.toFixed(2)} €</td>
                    <td>{f.tva.toFixed(2)} €</td>
                    <td style={{ fontWeight: 700 }}>{f.montantTTC.toFixed(2)} €</td>
                    <td>
                      <span className={`badge ${f.statut === 'Paye' ? 'badge-green' : f.statut === 'Annule' ? 'badge-red' : 'badge-yellow'}`}>
                        {f.statut === 'Paye' ? '✅ Payée' : f.statut === 'Annule' ? '❌ Annulée' : '⏳ Impayée'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => genererPDF(f)}>🖨 PDF</button>
                        {f.statut === 'Impaye' && (
                          <button className="btn btn-accent btn-sm" onClick={() => marquerPaye(f)}>💶 Payée</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <RapportDetailModal
          rapport={selected}
          onFacturer={facturer}
          onClose={() => setSelected(null)}
        />
      )}
    </Layout>
  )
}

function RapportDetailModal({ rapport: r, onFacturer, onClose }: {
  rapport: Rapport
  onFacturer: (r: Rapport) => Promise<void>
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const cfg = INTERVENTION_CONFIG[r.type]

  async function handle() {
    setLoading(true)
    await onFacturer(r)
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
          <div className="modal-title">{r.clientNom}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {([
              ['Client', r.clientNom],
              ['Téléphone', r.clientTel],
              ['Adresse', r.adresse],
              ['Type', r.type],
              ['Technicien', r.technicienNom],
              ['Date', new Date(r.date).toLocaleDateString('fr-FR') + ' · ' + r.heureDebut + ' → ' + r.heureFin],
              ['Encaissement', r.modeEncaissement],
              ['Satisfaction', (r.satisfaction || 0) + '/5 ⭐'],
            ] as [string, string][]).map(([k, v]) => (
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
              <div style={{ background: '#f8fafc', borderLeft: '3px solid #0d2d52', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                {r.description}
              </div>
            </div>
          )}

          {r.pieces.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Pièces utilisées</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.pieces.map((p, i) => <span key={i} className="badge badge-orange">🔩 {p}</span>)}
              </div>
            </div>
          )}

          <div style={{ background: '#f0fdf4', border: '2px solid #3a8c30', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#15803d' }}>
              <span>Montant HT</span>
              <span>{(r.montantFinal / 1.2).toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#15803d' }}>
              <span>TVA 20%</span>
              <span>{(r.montantFinal - r.montantFinal / 1.2).toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 18, color: '#0d2d52', borderTop: '1px solid #bbf7d0', paddingTop: 8, marginTop: 4 }}>
              <span>TOTAL TTC</span>
              <span style={{ color: '#3a8c30' }}>{r.montantFinal.toFixed(2)} €</span>
            </div>
          </div>

          {r.commentairePatron && (
            <div style={{ marginTop: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8' }}>
              💬 Commentaire patron : <em>{r.commentairePatron}</em>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={() => genererPDFRapport(r)}>📄 Rapport PDF</button>
          <button className="btn btn-accent" onClick={handle} disabled={loading}>
            {loading ? 'Génération…' : '🧾 Générer Facture PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF FACTURE ──
export function genererPDF(fac: Facture, rap?: Rapport) {
  const dateF = new Date(fac.dateFacture).toLocaleDateString('fr-FR')
  const dateI = fac.dateIntervention ? new Date(fac.dateIntervention).toLocaleDateString('fr-FR') : '—'

  const piecesHtml = (fac.pieces || []).length
    ? `<table class="tbl"><thead><tr><th>Pièce / Fourniture</th></tr></thead><tbody>${(fac.pieces || []).map((p) => `<tr><td>${p}</td></tr>`).join('')}</tbody></table>`
    : ''

  const ventesHtml = (fac.ventes || []).length
    ? `<table class="tbl"><thead><tr><th>Prestation</th><th class="right">Prix</th></tr></thead><tbody>${(fac.ventes || []).map((v) => `<tr><td>${v.label}</td><td class="right">${v.prixVente ? v.prixVente + ' €' : '—'}</td></tr>`).join('')}</tbody></table>`
    : ''

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${fac.ref}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a2e;background:#fff}
@page{size:A4;margin:15mm 18mm}
.page{max-width:210mm;margin:0 auto;padding:16mm 18mm}
.logo-row{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.brand{font-size:22pt;font-weight:900;color:#0d2d52}
.brand span{color:#3a8c30}
.divider{border:none;border-top:3px solid #0d2d52;margin:0 0 20px}
.meta{display:flex;justify-content:space-between;margin-bottom:24px}
.ref{font-size:20pt;font-weight:900;color:#0d2d52}
.ref span{color:#3a8c30}
.stitle{font-size:8pt;font-weight:700;color:#0d2d52;text-transform:uppercase;letter-spacing:1.5px;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}
.client-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px}
.client-name{font-size:14pt;font-weight:900;color:#0d2d52;margin-bottom:4px}
.tbl{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10pt}
.tbl th{background:#0d2d52;color:#fff;padding:6px 10px;text-align:left;font-size:9pt}
.tbl td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
.right{text-align:right}
.totals{margin-left:auto;width:260px;border:2px solid #0d2d52;border-radius:8px;overflow:hidden;margin-bottom:16px}
.totals tr td{padding:7px 14px;font-size:10.5pt}
.totals tr:last-child{background:#0d2d52;color:#fff;font-size:13pt;font-weight:900}
.totals tr:last-child td:last-child{color:#3a8c30}
.totals td:last-child{text-align:right;font-weight:700}
.footer{margin-top:24px;padding-top:10px;border-top:2px solid #0d2d52;display:flex;justify-content:space-between;font-size:8pt;color:#94a3b8}
.conditions{background:#f8fafc;border-radius:8px;padding:10px 14px;font-size:8.5pt;color:#64748b;line-height:1.7}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
<div class="logo-row">
<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect width="52" height="52" rx="12" fill="#0d2d52"/><path d="M14 38 C14 38 14 22 26 22 C38 22 38 14 38 14" stroke="#3a8c30" stroke-width="3.5" stroke-linecap="round" fill="none"/><circle cx="26" cy="22" r="4" fill="#3a8c30"/><path d="M20 36 Q26 28 32 36" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/><circle cx="26" cy="40" r="3" fill="#fff"/></svg>
<div><div class="brand">Green<span>Flow</span></div><div style="font-size:9pt;color:#64748b;text-transform:uppercase;letter-spacing:1.5px">Technologies · Plomberie & Chauffage</div></div>
<div style="margin-left:auto;text-align:right;font-size:8.5pt;color:#64748b">GreenFlow Technologies SAS<br>contact@greenflow.fr · www.greenflow.fr</div>
</div>
<hr class="divider">
<div class="meta">
<div><strong>FACTURE</strong><br>Date : ${dateF}<br>Intervention : ${dateI}<br>Technicien : ${fac.technicienNom || '—'}</div>
<div style="text-align:right"><div class="ref"><span>#</span>${fac.ref}</div><div style="font-size:9pt;color:#64748b;margin-top:4px">Émise le ${dateF}</div><div style="display:inline-block;background:#fef3c7;color:#92400e;font-size:8pt;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid #fcd34d;margin-top:6px">⏳ À RÉGLER</div></div>
</div>
<div class="stitle">Client</div>
<div class="client-box">
<div class="client-name">${fac.clientNom}</div>
<div style="font-size:10pt;color:#475569">${fac.clientTel ? '📞 ' + fac.clientTel + '<br>' : ''}${fac.adresse ? '📍 ' + fac.adresse : ''}</div>
</div>
${fac.description ? `<div class="stitle">Description des travaux</div><div style="background:#f8fafc;border-left:3px solid #0d2d52;border-radius:0 8px 8px 0;padding:10px 14px;font-size:10pt;color:#334155;line-height:1.7;margin-bottom:14px">${fac.description}</div>` : ''}
${piecesHtml ? `<div class="stitle">Pièces & fournitures</div>${piecesHtml}` : ''}
${ventesHtml ? `<div class="stitle">Prestations</div>${ventesHtml}` : ''}
<div class="stitle">Montants</div>
<table class="totals"><tbody>
<tr><td>Montant HT</td><td>${fac.montantHT.toFixed(2)} €</td></tr>
<tr><td>TVA (20%)</td><td>${fac.tva.toFixed(2)} €</td></tr>
<tr><td>TOTAL TTC</td><td>${fac.montantTTC.toFixed(2)} €</td></tr>
</tbody></table>
<div class="conditions"><strong style="color:#0d2d52">Conditions de règlement :</strong> Paiement à réception.<br>Modes acceptés : virement, chèque, espèces, CB.<br>Retard : pénalités au taux légal + 40 € forfait recouvrement.</div>
<div class="footer"><div><strong>GreenFlow Technologies SAS</strong><br>contact@greenflow.fr — www.greenflow.fr</div><div style="text-align:right">Réf : <strong>${fac.ref}</strong><br>Généré le ${dateF}</div></div>
</div><script>window.onload=function(){window.print()}<\/script></body></html>`

  const win = window.open('', '_blank', 'width=900,height=1100')
  if (win) { win.document.write(html); win.document.close() }
  else notify('⚠️ Autorisez les popups pour le PDF', 'error')
}

// ── PDF RAPPORT ──
export function genererPDFRapport(r: Rapport) {
  const cfg = INTERVENTION_CONFIG[r.type]
  const dateR = new Date(r.date).toLocaleDateString('fr-FR')
  const montantTTC = r.montantFinal
  const montantHT = Math.round((montantTTC / 1.2) * 100) / 100
  const tva = Math.round((montantTTC - montantHT) * 100) / 100

  const stepsHtml = cfg.steps
    .map((s, i) => `<div style="display:flex;gap:10px;margin-bottom:6px;font-size:10pt;color:#166534;align-items:flex-start"><span style="background:#3a8c30;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:700;flex-shrink:0;margin-top:1px">${i + 1}</span><div>${s}</div></div>`)
    .join('')

  const piecesHtml = r.pieces.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">${r.pieces.map((p) => `<span style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:3px 10px;font-size:10pt;color:#c2410c;font-weight:600">🔩 ${p}</span>`).join('')}</div>`
    : ''

  const sigHtml = r.signature
    ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;margin-bottom:12px"><div style="font-size:9pt;color:#64748b;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Signature du client</div><img src="${r.signature}" style="max-width:100%;max-height:80px"></div>`
    : ''

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport ${r.clientNom}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a2e;background:#fff}
@page{size:A4;margin:14mm 16mm}
.page{max-width:210mm;margin:0 auto;padding:14mm 16mm}
.brand{font-size:20pt;font-weight:900;color:#0d2d52}
.brand span{color:#3a8c30}
.doc-title{font-size:16pt;font-weight:900;color:#0d2d52;text-align:center;letter-spacing:2px;text-transform:uppercase;border-top:3px solid #0d2d52;border-bottom:1px solid #0d2d52;padding:7px 0;margin:10px 0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.ibox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px}
.ibl{font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.ival{font-size:11pt;font-weight:700;color:#0d2d52}
.ival.big{font-size:15pt;color:#3a8c30}
.stitle{font-size:8pt;font-weight:700;color:#0d2d52;text-transform:uppercase;letter-spacing:1.5px;margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid #0d2d52}
.proc-box{background:#f0fdf4;border-left:4px solid #3a8c30;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:12px}
.fin-table{width:220px;border:2px solid #0d2d52;border-radius:8px;overflow:hidden;margin:0 0 14px auto}
.fin-table tr td{padding:6px 12px;font-size:10.5pt}
.fin-table tr:last-child{background:#0d2d52;color:#fff;font-weight:900;font-size:12pt}
.fin-table td:last-child{text-align:right;font-weight:700}
.fin-table tr:last-child td:last-child{color:#3a8c30}
.footer{margin-top:20px;padding-top:10px;border-top:2px solid #0d2d52;display:flex;justify-content:space-between;font-size:8pt;color:#94a3b8}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="11" fill="#0d2d52"/><path d="M12 36 C12 36 12 20 24 20 C36 20 36 12 36 12" stroke="#3a8c30" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="24" cy="20" r="3.5" fill="#3a8c30"/><path d="M18 34 Q24 26 30 34" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="24" cy="37" r="2.5" fill="#fff"/></svg>
<div><div class="brand">Green<span>Flow</span></div><div style="font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:1.5px">Technologies · Plomberie & Chauffage</div></div>
<div style="margin-left:auto;text-align:right;font-size:8.5pt;color:#64748b">GreenFlow Technologies SAS<br>contact@greenflow.fr · www.greenflow.fr</div>
</div>
<div class="doc-title">Rapport d'intervention</div>
<div class="grid2">
<div class="ibox"><div class="ibl">Client</div><div class="ival">${r.clientNom}</div>${r.clientTel ? `<div style="font-size:10pt;color:#64748b;margin-top:2px">📞 ${r.clientTel}</div>` : ''}<div style="font-size:10pt;color:#64748b">📍 ${r.adresse}</div></div>
<div class="ibox"><div class="ibl">Intervention</div><div class="ival">${r.type}</div><div style="font-size:10pt;color:#64748b;margin-top:2px">📅 ${dateR} · ${r.heureDebut} → ${r.heureFin}</div><div style="font-size:10pt;color:#64748b">👷 ${r.technicienNom}</div>${r.mandant ? `<div style="font-size:10pt;color:#64748b">🏢 ${r.mandant}</div>` : ''}</div>
</div>
<div class="stitle">${cfg.icon} Procédure standard — ${r.type}</div>
<div class="proc-box">
<div style="font-size:9pt;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">✅ Procédure applicable</div>
${stepsHtml}
<div style="margin-top:8px;font-size:8.5pt;color:#64748b;font-style:italic">Normes : ${cfg.normes} · Garantie : ${cfg.garantie}</div>
</div>
<div class="stitle">📋 Constat & travaux réalisés</div>
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:10.5pt;color:#334155;line-height:1.7;margin-bottom:14px;min-height:50px">${r.description || '<em style="color:#94a3b8">Non renseigné</em>'}</div>
${piecesHtml ? `<div class="stitle">🔩 Pièces & fournitures</div>${piecesHtml}` : ''}
${montantTTC > 0 ? `
<div class="stitle">💶 Récapitulatif financier</div>
<table class="fin-table"><tbody>
<tr><td>Montant HT</td><td>${montantHT.toFixed(2)} €</td></tr>
<tr><td>TVA (20%)</td><td>${tva.toFixed(2)} €</td></tr>
<tr><td>TOTAL TTC</td><td>${montantTTC.toFixed(2)} €</td></tr>
</tbody></table>
${r.modeEncaissement ? `<div style="font-size:10pt;color:#475569;margin-bottom:12px">Encaissement : <strong>${r.modeEncaissement}</strong></div>` : ''}
` : ''}
${r.signature || r.satisfaction ? `
<div class="stitle">🖊 Validation client</div>
${sigHtml}
${r.satisfaction ? `<div style="font-size:10pt;margin-bottom:6px">Satisfaction : <strong>${r.satisfaction}/5 ⭐</strong></div>` : ''}
${r.retourRequis && r.retourRequis !== 'Non' ? `<div style="font-size:10pt;color:#dc2626;font-weight:700">⚠️ Retour requis : ${r.retourRequis}</div>` : ''}
` : ''}
${r.valideAt ? `
<div class="stitle">✅ Validation</div>
<div style="background:#f0fdf4;border:2px solid #3a8c30;border-radius:8px;padding:12px 16px;margin-bottom:12px">
<div style="font-size:10pt;color:#15803d">Validé le ${new Date(r.valideAt).toLocaleDateString('fr-FR')} par ${r.valideBy || '—'}${r.commentairePatron ? `<br><em>${r.commentairePatron}</em>` : ''}</div>
</div>
` : ''}
<div class="footer"><div><strong>GreenFlow Technologies SAS</strong><br>contact@greenflow.fr — www.greenflow.fr</div><div style="text-align:right">Rapport ${r.clientNom}<br>Généré le ${dateR}</div></div>
</div><script>window.onload=function(){window.print()}<\/script></body></html>`

  const win = window.open('', '_blank', 'width=950,height=1200')
  if (win) { win.document.write(html); win.document.close() }
  else notify('⚠️ Autorisez les popups pour le PDF', 'error')
}
