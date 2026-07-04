import type { User, Role } from '../types'

const KEY = 'gf2_session'

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setSession(user: User): void {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}

export const ROLE_LABELS: Record<Role, string> = {
  tech: 'Technicien',
  dispatch: 'Dispatch / Planning',
  secretaire: 'Secrétaire',
  patron: 'Patron',
}

export const ROLE_ICONS: Record<Role, string> = {
  tech: '🔧',
  dispatch: '📋',
  secretaire: '🗂️',
  patron: '👔',
}

export const ROLE_HOME: Record<Role, string> = {
  tech: '/tech',
  dispatch: '/dispatch',
  secretaire: '/secretaire',
  patron: '/patron',
}
