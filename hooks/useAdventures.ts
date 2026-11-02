import { useCallback, useEffect, useState } from 'react'

import type { AdventureBoard } from '@/lib/compendium/adventure-rules'
import { fetchAdventureBoard } from '@/lib/services/adventure-service'

// Тропа читается целиком одним запросом: карта приключений — это доска,
// а не список, который листают курсором.
export function useAdventures(token: string | null) {
  const [board, setBoard] = useState<AdventureBoard | null>(null)
  const [error, setError] = useState('')
  const [requested, setRequested] = useState(0)

  const refresh = useCallback(() => setRequested((value) => value + 1), [])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    fetchAdventureBoard(token)
      .then((data) => {
        if (cancelled) return
        setBoard(data)
        setError('')
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setBoard(null)
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить карту приключений')
      })

    return () => {
      cancelled = true
    }
  }, [token, requested])

  // Ответ ждём только когда идти за ним реально есть куда: без токена
  // страница показывает заглушку входа, а не «загрузку» навсегда.
  return { board, error, loading: Boolean(token) && !board && !error, refresh }
}
