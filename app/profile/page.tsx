'use client'

import { useRouter } from 'next/navigation'
import ProfileScreen from '@/components/menu/ProfileScreen'
import { useProfile } from '@/hooks/useProfile'

export default function ProfilePage() {
  const router = useRouter()
  const { user, scores } = useProfile()

  return <ProfileScreen user={user} scores={scores} onBack={() => router.push('/menu')} backLabel="Главное меню" />
}
