import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setSession, ROLE_LABELS, ROLE_ICONS, ROLE_HOME } from '../lib/session'
import { saveUser, newId } from '../lib/db'
import type { Role } from '../types'

const ROLES: Role[] = ['tech', 'dispatch', 'secretaire', 'patron']

export default function Login() {
  const [nom, setNom] = useState('')
  const [role, setRole] = useState<Role>('tech')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) return
    setLoading(true)
    const user = { id: newId(), nom: nom.trim(), role, actif: true }
    await saveUser(user)
    setSession(user)
    navigate(ROLE_HOME[role])
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d2d52 0%, #1a4a7a 60%, #0d2d52 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect width="52" height="52" rx="14" fill="rgba(255,255,255,0.12)" />
              <path d="M14 38 C14 38 14 22 26 22 C38 22 38 14 38 14" stroke="#3a8c30" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <circle cx="26" cy="22" r="4" fill="#3a8c30" />
              <path d="M20 36 Q26 28 32 36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="26" cy="40" r="3" fill="#fff" />
            </svg>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>
                Green<span style={{ color: '#4caf40' }}>Flow</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2 }}>
                Gestion interventions
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '32px 36px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0d2d52', marginBottom: 6 }}>Connexion</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Entrez votre nom et choisissez votre rôle</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Votre prénom / nom</label>
              <input
                className="form-control"
                type="text"
                placeholder="Ex : Jean Dupont"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Votre rôle</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '12px 10px',
                      border: `2px solid ${role === r ? '#0d2d52' : '#e2e8f0'}`,
                      borderRadius: 10,
                      background: role === r ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{ROLE_ICONS[r]}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: role === r ? '#0d2d52' : '#475569' }}>
                      {ROLE_LABELS[r]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !nom.trim()}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Connexion…' : 'Accéder à mon espace →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
