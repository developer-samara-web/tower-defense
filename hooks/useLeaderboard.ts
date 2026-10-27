import { useState, useEffect } from 'react'
import { fetchTopScores } from '@/lib/services/score-service'
import type { PlayerScore } from '@/features/account/types'

export function useLeaderboard(limit = 8) {
  const [scores, setScores] = useState<PlayerScore[]>([])

  useEffect(() => {
    fetchTopScores(limit).then((s: PlayerScore[]) => setScores(s || []))
  }, [limit])

  const refresh = () => fetchTopScores(limit).then((s: PlayerScore[]) => setScores(s || []))

  return { scores, refresh }
}
