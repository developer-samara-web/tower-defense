'use client'

import { useRouter } from 'next/navigation'
import ProfileScreen from '@/components/menu/ProfileScreen'
import { useProfile } from '@/hooks/useProfile'

export default function ProfilePage() {
  const router = useRouter()
  const { user, token, updateUser } = useProfile()

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
