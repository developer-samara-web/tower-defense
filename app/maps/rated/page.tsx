'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import MapsMenu from '@/components/menu/MapsMenu'
import MapBoardPanel from '@/components/menu/MapBoardPanel'
import AuthRequiredScreen from '@/components/auth/AuthRequiredScreen'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'
import type { MapSummary } from '@/types'

export default function RatedMapsPage() {
  const router = useRouter()
  const { token, user, checked } = useAuth()
  const [openMap, setOpenMap] = useState<MapSummary | null>(null)

  // Забег идёт по id карты: только так он признаётся рейтинговым на сервере.
  const play = (map: MapSummary) => {
    router.push(`/game?map=${encodeURIComponent(map.id)}`)
  }

  // Рейтинговый каталог — часть игры: гостю здесь нечего выбирать.
  if (!checked) return <LoadingScreen message="Проверяем сессию…" />
  if (!user) return <AuthRequiredScreen />

  if (openMap) {
    return (
      <MapBoardPanel
        token={token}
        user={user}
        map={openMap}
        onBack={() => setOpenMap(null)}
        onPlay={play}
      />
    )
  }

  return (
    <MapsMenu
      token={token}
      user={user}
      fixedTab="rated"
      onBack={() => router.push('/play?mode=solo')}
      onPlay={play}
      onEdit={(map) => router.push(`/maps/editor?id=${encodeURIComponent(map.id)}`)}
      onOpenMap={setOpenMap}
    />
  )
}
