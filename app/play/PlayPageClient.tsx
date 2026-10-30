'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PlayMenu from '@/components/menu/PlayMenu'
import { fetchRatedMap } from '@/lib/services/map-service'
import { useAuth } from '@/hooks/useAuth'

export default function PlayPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token } = useAuth()
  const modeParam = searchParams.get('mode')
  const initialMode = modeParam === 'solo' || modeParam === 'coop' ? modeParam : 'root'
  const [rankedBusy, setRankedBusy] = useState(false)
  const [rankedError, setRankedError] = useState<string | null>(null)

  // Рейтинговый заход стартует со случайной одобренной рейтинговой карты,
  // поэтому без токена и без такой карты в библиотеке игру не начать.
  const startRanked = async () => {
    if (rankedBusy) return
    if (!token) {
      setRankedError('Войдите в аккаунт, чтобы играть рейтинг')
      return
    }

    setRankedBusy(true)
    setRankedError(null)
    try {
      const map = await fetchRatedMap(token)
      router.push(`/game?map=${encodeURIComponent(map.id)}`)
    } catch (error) {
      setRankedError(error instanceof Error ? error.message : 'Не удалось начать рейтинговую игру')
      setRankedBusy(false)
    }
  }

  return (
    <PlayMenu
      user={user}
      initialMode={initialMode}
      onBack={() => router.push('/menu')}
      onRandomMap={() => router.push('/game')}
      onRankedMap={() => void startRanked()}
      rankedBusy={rankedBusy}
      rankedError={rankedError}
    />
  )
}
