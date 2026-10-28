import { useCallback, useEffect, useRef, useState } from 'react'

import type { GameRecord } from '@/features/account/types'
import { fetchGames } from '@/lib/services/game-service'
import { useAuth } from './useAuth'

const PAGE_SIZE = 10

// История игр грузится страницами по 10 записей: сначала последние,
// дальше — по кнопке «Показать ещё».
export function useGameHistory() {
  const { token } = useAuth()
  const [games, setGames] = useState<GameRecord[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  // Токен читается из localStorage, которого нет на сервере: до монтирования
  // показываем то же состояние, что и в SSR, иначе ломается гидратация.
  const [mounted, setMounted] = useState(false)
  const aliveRef = useRef(true)
  const requestRef = useRef(0)

  useEffect(() => {
    aliveRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    return () => {
      aliveRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    const request = ++requestRef.current

    if (!token) {
      setGames([])
      setCursor(null)
      setHasMore(false)
      setLoading(false)
      setError(false)
      return
    }

    setLoading(true)
    setError(false)

    try {
      const page = await fetchGames(token, { limit: PAGE_SIZE })
      if (!aliveRef.current || request !== requestRef.current) return
      setGames(page.games)
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      if (!aliveRef.current || request !== requestRef.current) return
      setError(true)
    } finally {
      if (aliveRef.current && request === requestRef.current) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!token || !cursor || !hasMore || loadingMore) return
    const request = requestRef.current

    setLoadingMore(true)
    setError(false)

    try {
      const page = await fetchGames(token, { limit: PAGE_SIZE, cursor })
      if (!aliveRef.current || request !== requestRef.current) return

      setGames((prev) => {
        const seen = new Set(prev.map((game) => game.id))
        return [...prev, ...page.games.filter((game) => !seen.has(game.id))]
      })
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      if (aliveRef.current && request === requestRef.current) setError(true)
    } finally {
      if (aliveRef.current && request === requestRef.current) setLoadingMore(false)
    }
  }, [token, cursor, hasMore, loadingMore])

  return {
    games,
    hasMore,
    loading,
    loadingMore,
    error,
    locked: !mounted || !token,
    refresh,
    loadMore,
  }
}
