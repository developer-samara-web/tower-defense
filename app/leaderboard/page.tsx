'use client'

import { useRouter } from 'next/navigation'
import LeaderboardScreen from '@/components/menu/LeaderboardScreen'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAuth } from '@/hooks/useAuth'

export default function LeaderboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { scores } = useLeaderboard(50)

  return <LeaderboardScreen scores={scores} currentUserId={user?.id} onBack={() => router.push('/menu')} />
}
