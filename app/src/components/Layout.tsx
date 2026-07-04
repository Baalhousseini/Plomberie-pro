import { NavLink, useNavigate } from 'react-router-dom'
import { getSession, clearSession, ROLE_ICONS, ROLE_LABELS } from '../lib/session'

interface LayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Layout({ children, title, subtitle, actions }: LayoutProps) {
  const user = getSession()
  const navigate = useNavigate()

  function logout() {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Green<span>Flow</span></div>
          <div className="sidebar-logo-sub">Technologies · Plomberie</div>
        </div>

        <nav className="sidebar-nav">
          {user?.role === 'dispatch' && (
            <>
              <div className="sidebar-section">Planning</div>
              <NavLink to="/dispatch" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📋</span> Tableau de bord
              </NavLink>
              <NavLink to="/dispatch/rdvs" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📅</span> Interventions
              </NavLink>
              <NavLink to="/dispatch/nouveau" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">➕</span> Nouveau RDV
              </NavLink>
              <NavLink to="/dispatch/rapports" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📝</span> Rapports reçus
              </NavLink>
            </>
          )}

          {user?.role === 'tech' && (
            <>
              <div className="sidebar-section">Mes interventions</div>
              <NavLink to="/tech" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📋</span> Aujourd'hui
              </NavLink>
              <NavLink to="/tech/rapport" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📝</span> Saisir rapport
              </NavLink>
              <NavLink to="/tech/historique" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">🕐</span> Historique
              </NavLink>
            </>
          )}

          {user?.role === 'secretaire' && (
            <>
              <div className="sidebar-section">Gestion</div>
              <NavLink to="/secretaire" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📊</span> Tableau de bord
              </NavLink>
              <NavLink to="/secretaire/rapports" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📝</span> Rapports à facturer
              </NavLink>
              <NavLink to="/secretaire/factures" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">🧾</span> Factures
              </NavLink>
            </>
          )}

          {user?.role === 'patron' && (
            <>
              <div className="sidebar-section">Direction</div>
              <NavLink to="/patron" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">📊</span> Dashboard
              </NavLink>
              <NavLink to="/patron/validation" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">✅</span> Validation rapports
              </NavLink>
              <NavLink to="/patron/facturation" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="icon">💶</span> Facturation
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill" onClick={logout} title="Déconnexion">
            <div className="user-avatar">{user?.nom[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.nom}</div>
              <div className="user-role">{user ? ROLE_ICONS[user.role] + ' ' + ROLE_LABELS[user.role] : ''}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="page-header">
          <div>
            <div className="page-title">{title}</div>
            {subtitle && <div className="page-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  )
}
