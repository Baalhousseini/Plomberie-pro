import { useState, useCallback, useEffect } from 'react'

type NotifType = 'default' | 'success' | 'error'

interface NotifState {
  id: number
  message: string
  type: NotifType
}

let _notify: ((msg: string, type?: NotifType) => void) | null = null

export function notify(msg: string, type: NotifType = 'default') {
  _notify?.(msg, type)
}

export default function NotifContainer() {
  const [notifs, setNotifs] = useState<NotifState[]>([])

  const show = useCallback((msg: string, type: NotifType = 'default') => {
    const id = Date.now()
    setNotifs((n) => [...n, { id, message: msg, type }])
    setTimeout(() => setNotifs((n) => n.filter((x) => x.id !== id)), 3500)
  }, [])

  useEffect(() => {
    _notify = show
    return () => { _notify = null }
  }, [show])

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {notifs.map((n) => (
        <div key={n.id} className={`notif ${n.type !== 'default' ? n.type : ''}`}>
          {n.message}
        </div>
      ))}
    </div>
  )
}
