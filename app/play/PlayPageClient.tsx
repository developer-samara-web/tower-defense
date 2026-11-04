'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import AuthRequiredScreen from '@/components/auth/AuthRequiredScreen'
import PlayMenu from '@/components/menu/PlayMenu'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

export default function PlayPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, checked } = useAuth()
  const modeParam = searchParams.get('mode')
  const initialMode = modeParam === 'solo' || modeParam === 'coop' ? modeParam : 'root'

  if (!checked) return <LoadingScreen message="Проверяем сессию…" />
  if (!user) return <AuthRequiredScreen />

  return (
    <PlayMenu
      user={user}
      initialMode={initialMode}
      onBack={() => router.push('/menu')}
      onRandomMap={() => router.push('/game')}
      // Обучение — своя зафиксированная карта с подсказками и пятью волнами;
      // режим отдаётся игровому клиенту через запрос.
      onTutorial={() => router.push('/game?tutorial=1')}
      // Рейтинг начинают с выбора карты: страница показывает только
      // одобренные рейтинговые карты, и забег засчитывается по её id.
      onRankedMap={() => router.push('/maps/rated')}
    />
  )
}
