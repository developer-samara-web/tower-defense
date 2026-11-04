'use client'

import { useRouter } from 'next/navigation'
import MainMenu from '@/components/menu/MainMenu'
import RatedInfoPopup from '@/components/menu/RatedInfoPopup'
import AuthRequiredScreen from '@/components/auth/AuthRequiredScreen'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'
import { useProgress } from '@/hooks/useProgress'

export default function MenuPage() {
  const router = useRouter()
  const { user, checked, logout } = useAuth()
  const { flags, mark } = useProgress()

  const goProfile = () => router.push('/profile')
  const goLeaderboard = () => router.push('/leaderboard')
  const goAdventures = () => router.push('/adventures')
  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  // Рассказ про рейтинг показываем один раз за аккаунт: сразу после
  // пройденного обучения. Флаг «показано» живёт на сервере, поэтому
  // подсказка не вернётся после смены браузера.
  const showRatedIntro = Boolean(flags?.tutorialCompleted && !flags.ratedIntroShown)
  const closeRatedIntro = () => mark({ ratedIntroShown: true })

  // Гость не должен видеть меню: играть, профиль и приключения ему всё
  // равно недоступны, а кнопки вели бы в закрытые разделы.
  if (!checked) return <LoadingScreen message="Проверяем сессию…" />
  if (!user) return <AuthRequiredScreen />

  return (
    <>
      <MainMenu
        user={user}
        onPlay={() => router.push('/play')}
        onAdventures={goAdventures}
        onProfile={goProfile}
        onLeaderboard={goLeaderboard}
        onLogout={handleLogout}
      />
      {showRatedIntro ? (
        <RatedInfoPopup
          onClose={closeRatedIntro}
          onAdventures={() => {
            closeRatedIntro()
            goAdventures()
          }}
        />
      ) : null}
    </>
  )
}
