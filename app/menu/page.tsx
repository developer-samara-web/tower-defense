'use client'

import { useRouter } from 'next/navigation'
import MainMenu from '@/components/menu/MainMenu'
import { useAuth } from '@/hooks/useAuth'

export default function MenuPage() {
  const router = useRouter()
  const { user, token, logout, setUser } = useAuth()

  const goProfile = () => router.push('/profile')
  const goLeaderboard = () => router.push('/leaderboard')
  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  return (
    <MainMenu
      user={user}
      token={token}
      onUserChange={setUser}
      onPlay={() => router.push('/play')}
      onProfile={goProfile}
      onLeaderboard={goLeaderboard}
      onLogout={handleLogout}
    />
  )
}
