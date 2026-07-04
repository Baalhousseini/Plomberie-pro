import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, onValue, push, remove, DatabaseReference } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyC_AuyKpLaoTAdi5R5VNh8Jn-k_jN_541A',
  authDomain: 'plomberie-pro-7a56a.firebaseapp.com',
  databaseURL: 'https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'plomberie-pro-7a56a',
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

const NS = 'gf2/' // namespace isolé pour la nouvelle app

export function dbRef(path: string): DatabaseReference {
  return ref(db, NS + path)
}

export async function dbGet<T>(path: string): Promise<T | null> {
  const snap = await get(dbRef(path))
  if (!snap.exists()) return null
  return snap.val() as T
}

export async function dbSet(path: string, value: unknown): Promise<void> {
  await set(dbRef(path), value)
}

export async function dbPush(path: string, value: unknown): Promise<string> {
  const r = await push(dbRef(path), value)
  return r.key!
}

export async function dbRemove(path: string): Promise<void> {
  await remove(dbRef(path))
}

export function dbListen<T>(path: string, cb: (val: T | null) => void): () => void {
  const unsubscribe = onValue(dbRef(path), (snap) => {
    cb(snap.exists() ? (snap.val() as T) : null)
  })
  return unsubscribe
}

// Convert Firebase object (keyed by id) to array
export function objToArray<T>(obj: Record<string, T> | null): T[] {
  if (!obj) return []
  return Object.entries(obj).map(([id, val]) => ({ ...val, id }))
}
