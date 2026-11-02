import { useState, useEffect } from 'react'
import { fetchTopScores } from '@/lib/services/score-service'
import { useAuth } from './useAuth'
import type { PlayerProfile, PlayerScore } from '@/features/account/types'

export function useProfile() {
  const { user, token, checked, setUser } = useAuth()
  const [scores, setScores] = useState<PlayerScore[]>([])

  useEffect(() => {
    fetchTopScores().then((s: PlayerScore[]) => setScores(s || []))
  }, [])

  return {
    user: user as PlayerProfile | null,
    scores,
    token,
    // Страница ждёт проверки токена, иначе гость увидит экран входа на
    // долю секунды раньше, чем успеет вернуться владелец сессии.
    checked,
    updateUser: (profile: PlayerProfile) => setUser(profile),
  }
}
