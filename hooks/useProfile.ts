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
    // Проверка сессии завершена? Пока нет, страница показывает прелоадер:
    // владелец токена не должен видеть экран входа, пока /api/auth/me в пути.
    checked,
    updateUser: (profile: PlayerProfile) => setUser(profile),
  }
}
