import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useCheatLock() {
  const { user } = useAuth()
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('cheat_locks')
      .select('locked_until')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data?.locked_until && new Date(data.locked_until) > new Date()) {
      setLockedUntil(new Date(data.locked_until))
    } else {
      setLockedUntil(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const createLock = async (hours: number, reason: string) => {
    if (!user) return
    const until = new Date(Date.now() + hours * 60 * 60 * 1000)
    await supabase
      .from('cheat_locks')
      .upsert({ user_id: user.id, locked_until: until.toISOString(), reason })
    setLockedUntil(until)
  }

  return { lockedUntil, loading, createLock, refresh }
}