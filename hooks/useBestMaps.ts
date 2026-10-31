import { useCallback, useEffect, useRef, useState } from 'react'

import type { PlayerBestMap } from '@/types'
import { fetchBestMaps } from '@/lib/services/score-service'
import { useAuth } from './useAuth'

const LIMIT = 8

// Лучшие карты игрока: по одному рекорду с карты, как top plays в osu!.
// Отдельный запрос, потому что рекорды живут в топе карт, а не в истории игр.
export function useBestMaps() {
  const { token } = useAuth()
  const [maps, setMaps] = useState<PlayerBestMap[]>([])
  const [ratingPoints, setRatingPoints] = useState(0)
  const [rank, setRank] = useState(0)
  const [ratedMaps, setRatedMaps] = useState(0)
  const [loading, setLoading] = useState(false)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!token) {
      setMaps([])
      setRatingPoints(0)
      setRank(0)
      setRatedMaps(0)
      return
    }

    setLoading(true)
    const data = await fetchBestMaps(token, LIMIT)
    if (!aliveRef.current || !data) {
      setLoading(false)
      return
    }

    setMaps(data.maps)
    setRatingPoints(data.ratingPoints)
    setRank(data.rank)
    setRatedMaps(data.ratedMaps)
    setLoading(false)
  }, [token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  return { maps, ratingPoints, rank, ratedMaps, loading, refresh }
}
