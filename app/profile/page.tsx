'use client'

import { useRouter } from 'next/navigation'
import ProfileScreen from '@/components/menu/ProfileScreen'
import AccessScreen from '@/components/ui/AccessScreen'
import { NOT_AUTHORIZED } from '@/lib/access-messages'
import { useProfile } from '@/hooks/useProfile'

export default function ProfilePage() {
  const router = useRouter()
  const { user, token, checked, updateUser } = useProfile()

  // Профиль строится из токена: без входа показывать нечего.
  if (checked && !user) {
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
