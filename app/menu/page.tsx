'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MainMenu from '@/components/menu/MainMenu'
import PlayMenu from '@/components/menu/PlayMenu'
import { useAuth } from '@/hooks/useAuth'

export default function MenuPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [showPlayMenu, setShowPlayMenu] = useState(false)

  const goRandomMap = () => router.push('/game')
  const goProfile = () => router.push('/profile')
  const goLeaderboard = () => router.push('/leaderboard')
  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  if (showPlayMenu) {
    return (
      <PlayMenu
        user={user}
        onBack={() => setShowPlayMenu(false)}
        onRandomMap={goRandomMap}
      />
    )
  }

  return (
    <MainMenu
      user={user}
      onPlay={() => setShowPlayMenu(true)}
      onProfile={goProfile}
      onLeaderboard={goLeaderboard}
      onLogout={handleLogout}
    />
  )
}
