'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import PlayMenu from '@/components/menu/PlayMenu'
import { useAuth } from '@/hooks/useAuth'

export default function PlayPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token, setUser } = useAuth()
  const initialMode = searchParams.get('mode') === 'solo' ? 'solo' : 'root'

  return (
    <PlayMenu
      user={user}
      token={token}
      onUserChange={setUser}
      initialMode={initialMode}
      onBack={() => router.push('/menu')}
      onRandomMap={() => router.push('/game')}
    />
  )
}
