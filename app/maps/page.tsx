'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import MapsMenu from '@/components/menu/MapsMenu'
import MapBoardPanel from '@/components/menu/MapBoardPanel'
import { useAuth } from '@/hooks/useAuth'
import type { MapSummary } from '@/types'

export default function MapsPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  // Открытая карта — своя страница с её личным топом.
  const [openMap, setOpenMap] = useState<MapSummary | null>(null)

  // Библиотечная игра всегда идёт по id карты: тогда её топ и очки считаются
  // даже для старых карт, у которых есть только сид.
  const play = (map: MapSummary) => {
    router.push(`/game?map=${encodeURIComponent(map.id)}`)
  }

  const edit = (map: MapSummary) => {
    router.push(`/maps/editor?id=${encodeURIComponent(map.id)}`)
  }

  if (openMap) {
    return (
      <MapBoardPanel
        token={token}
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
      onBack={() => router.push('/play?mode=solo')}
      onPlay={play}
      onEdit={edit}
      onOpenMap={setOpenMap}
    />
  )
}
