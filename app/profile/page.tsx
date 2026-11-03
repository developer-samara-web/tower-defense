'use client'

import { useRouter } from 'next/navigation'
import ProfileScreen from '@/components/menu/ProfileScreen'
import AccessScreen from '@/components/ui/AccessScreen'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { NOT_AUTHORIZED } from '@/lib/access-messages'
import { useProfile } from '@/hooks/useProfile'

export default function ProfilePage() {
  const router = useRouter()
  const { user, token, checked, updateUser } = useProfile()

  // Профиль строится из токена: без входа показывать нечего.
  // Сначала ждём ответ /api/auth/me — игрок с живой сессией не должен
  // увидеть отказ, пока проверка ещё в пути.
  if (!checked) return <LoadingScreen message="Загрузка профиля…" />

  if (!user) {
    return (
      <AccessScreen
        title="Нужен вход в аккаунт"
        message={NOT_AUTHORIZED}
        actions={[
          { label: 'Войти', onClick: () => router.push('/auth') },
          { label: 'Главное меню', onClick: () => router.push('/menu') },
        ]}
      />
    )
  }

  return (
    <ProfileScreen
      user={user}
      onBack={() => router.push('/menu')}
      backLabel="Главное меню"
      token={token}
      onUserChange={updateUser}
    />
  )
}
