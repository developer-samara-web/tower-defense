'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import MapsMenu from '@/components/menu/MapsMenu'
import MapBoardPanel from '@/components/menu/MapBoardPanel'
import { useAuth } from '@/hooks/useAuth'
import type { MapSummary } from '@/types'

export default function RatedMapsPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [openMap, setOpenMap] = useState<MapSummary | null>(null)

  // Забег идёт по id карты: только так он признаётся рейтинговым на сервере.
  const play = (map: MapSummary) => {
    router.push(`/game?map=${encodeURIComponent(map.id)}`)
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
      fixedTab="rated"
      onBack={() => router.push('/play?mode=solo')}
      onPlay={play}
      onEdit={(map) => router.push(`/maps/editor?id=${encodeURIComponent(map.id)}`)}
      onOpenMap={setOpenMap}
    />
  )
}
