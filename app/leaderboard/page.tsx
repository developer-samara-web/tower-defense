'use client'

import { useRouter } from 'next/navigation'
import LeaderboardScreen from '@/components/menu/LeaderboardScreen'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAuth } from '@/hooks/useAuth'

export default function LeaderboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { scores } = useLeaderboard(50)

  // Гость пришёл из лендинга: ему некуда возвращаться в меню, поэтому
  // кнопка ведёт на главную, а не в закрытый раздел.
  return (
    <LeaderboardScreen
      scores={scores}
      currentUserId={user?.id}
      onBack={() => router.push(user ? '/menu' : '/')}
      backLabel={user ? 'Главное меню' : 'На главную'}
    />
  )
}
