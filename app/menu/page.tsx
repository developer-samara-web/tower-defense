'use client'

import { useRouter } from 'next/navigation'
import MainMenu from '@/components/menu/MainMenu'
import { useAuth } from '@/hooks/useAuth'

export default function MenuPage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const goSingle = () => router.push('/game')
  const goProfile = () => router.push('/profile')
  const goLeaderboard = () => router.push('/leaderboard')
  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  return <MainMenu user={user} onSingle={goSingle} onProfile={goProfile} onLeaderboard={goLeaderboard} onLogout={handleLogout} />
}
