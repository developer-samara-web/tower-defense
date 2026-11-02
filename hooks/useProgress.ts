import { useCallback, useEffect, useState } from 'react'

import {
  fetchProgress,
  markProgress,
  type ProgressFlags,
} from '@/lib/services/progress-service'
import { useAuth } from './useAuth'

const EMPTY: ProgressFlags = { tutorialCompleted: false, ratedIntroShown: false }

// Прогресс обучения нужен главному меню, чтобы один раз показать рассказ
// про рейтинг. Ответ ждём без блокировки интерфейса: «проверено» считаем
// и неудачу, иначе меню зависело бы на каждое открытие.
export function useProgress() {
  const { token } = useAuth()
  const [flags, setFlags] = useState<ProgressFlags | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchProgress(token)
      .then((data) => {
        if (!cancelled) setFlags(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const mark = useCallback((patch: Partial<ProgressFlags>) => {
    setFlags((current) => ({ ...(current ?? EMPTY), ...patch }))
    if (!token) return
    markProgress(token, patch).catch(() => {
      setFailed(true)
    })
  }, [token])

  return {
    flags,
    checked: !token || flags !== null || failed,
    mark,
  }
}
