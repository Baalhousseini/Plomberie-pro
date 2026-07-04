import { dbRef, db, objToArray } from './firebase'
import { set, push, get, onValue } from 'firebase/database'
import type { User, Rdv, Rapport, Facture } from '../types'

// ── USERS ──
export async function getUsers(): Promise<User[]> {
  const snap = await get(dbRef('users'))
  return objToArray<User>(snap.val())
}
export async function saveUser(user: User): Promise<void> {
  await set(dbRef(`users/${user.id}`), user)
}

// ── RDVs ──
export async function getRdvs(): Promise<Rdv[]> {
  const snap = await get(dbRef('rdvs'))
  return objToArray<Rdv>(snap.val())
}
export async function saveRdv(rdv: Rdv): Promise<void> {
  await set(dbRef(`rdvs/${rdv.id}`), rdv)
}
export function listenRdvs(cb: (rdvs: Rdv[]) => void): () => void {
  return onValue(dbRef('rdvs'), (snap) => {
    cb(objToArray<Rdv>(snap.val()))
  })
}

// ── RAPPORTS ──
export async function getRapports(): Promise<Rapport[]> {
  const snap = await get(dbRef('rapports'))
  return objToArray<Rapport>(snap.val())
}
export async function saveRapport(r: Rapport): Promise<void> {
  await set(dbRef(`rapports/${r.id}`), r)
}
export function listenRapports(cb: (rapports: Rapport[]) => void): () => void {
  return onValue(dbRef('rapports'), (snap) => {
    cb(objToArray<Rapport>(snap.val()))
  })
}

// ── FACTURES ──
export async function getFactures(): Promise<Facture[]> {
  const snap = await get(dbRef('factures'))
  return objToArray<Facture>(snap.val())
}
export async function saveFacture(f: Facture): Promise<void> {
  await set(dbRef(`factures/${f.id}`), f)
}
export function listenFactures(cb: (factures: Facture[]) => void): () => void {
  return onValue(dbRef('factures'), (snap) => {
    cb(objToArray<Facture>(snap.val()))
  })
}

// ── HELPERS ──
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nextRef(prefix: string, items: { ref?: string }[]): string {
  const year = new Date().getFullYear()
  const existing = items
    .filter((i) => i.ref?.startsWith(`${prefix}-${year}-`))
    .map((i) => parseInt(i.ref!.split('-')[2] || '0'))
    .filter((n) => !isNaN(n))
  const next = existing.length ? Math.max(...existing) + 1 : 1
  return `${prefix}-${year}-${String(next).padStart(3, '0')}`
}

export { db }
