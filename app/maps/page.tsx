'use client'

import { useRouter } from 'next/navigation'
import MapsMenu from '@/components/menu/MapsMenu'
import { useAuth } from '@/hooks/useAuth'
import type { MapSummary } from '@/types'

export default function MapsPage() {
  const router = useRouter()
  const { token, user } = useAuth()

  const play = (map: MapSummary) => {
    const query = map.custom
      ? `map=${encodeURIComponent(map.id)}`
      : `seed=${encodeURIComponent(map.seed)}`
    router.push(`/game?${query}`)
  }

  const edit = (map: MapSummary) => {
    router.push(`/maps/editor?id=${encodeURIComponent(map.id)}`)
  }

  return (
    <MapsMenu
      token={token}
      user={user}
      onBack={() => router.push('/play?mode=solo')}
      onPlay={play}
      onEdit={edit}
    />
  )
}
