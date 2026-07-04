import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getSession, ROLE_HOME } from './lib/session'
import Login from './pages/Login'
import Dispatch from './pages/Dispatch'
import Tech from './pages/Tech'
import Secretaire from './pages/Secretaire'
import Patron from './pages/Patron'
import NotifContainer from './components/Notif'
import './styles/global.css'

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const user = getSession()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <>{children}</>
}

function Root() {
  const user = getSession()
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <NotifContainer />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dispatch/*" element={
          <PrivateRoute roles={['dispatch', 'patron']}>
            <Dispatch />
          </PrivateRoute>
        } />

        <Route path="/tech/*" element={
          <PrivateRoute roles={['tech']}>
            <Tech />
          </PrivateRoute>
        } />

        <Route path="/secretaire/*" element={
          <PrivateRoute roles={['secretaire', 'patron']}>
            <Secretaire />
          </PrivateRoute>
        } />

        <Route path="/patron/*" element={
          <PrivateRoute roles={['patron']}>
            <Patron />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
