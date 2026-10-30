'use client'

import { useRouter } from 'next/navigation'
import MainMenu from '@/components/menu/MainMenu'
import { useAuth } from '@/hooks/useAuth'

export default function MenuPage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const goProfile = () => router.push('/profile')
  const goLeaderboard = () => router.push('/leaderboard')
  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  return (
    <MainMenu
      user={user}
      onPlay={() => router.push('/play')}
      onProfile={goProfile}
      onLeaderboard={goLeaderboard}
      onLogout={handleLogout}
    />
  )
}
