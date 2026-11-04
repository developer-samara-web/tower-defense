import { useState, useEffect } from 'react'
import { fetchTopScores } from '@/lib/services/score-service'
import type { PlayerScore } from '@/features/account/types'

export function useLeaderboard(limit = 8) {
  const [scores, setScores] = useState<PlayerScore[]>([])

  // Если сервер недоступен, показываем пустую таблицу, а не ошибку в
  // консоли: топ — витрина, из-за неё страница не должна ломаться.
  useEffect(() => {
    let alive = true

    fetchTopScores(limit)
      .then((rows: PlayerScore[]) => {
        if (alive) setScores(rows || [])
      })
      .catch(() => {
        if (alive) setScores([])
      })

    return () => {
      alive = false
    }
  }, [limit])

  const refresh = () =>
    fetchTopScores(limit)
      .then((rows: PlayerScore[]) => setScores(rows || []))
      .catch(() => setScores([]))

  return { scores, refresh }
}
