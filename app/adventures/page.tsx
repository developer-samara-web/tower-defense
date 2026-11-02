'use client'

import { useRouter } from 'next/navigation'

import AdventuresMap from '@/components/menu/AdventuresMap'
import AccessScreen from '@/components/ui/AccessScreen'
import { NOT_AUTHORIZED } from '@/lib/access-messages'
import { useAdventures } from '@/hooks/useAdventures'
import { useAuth } from '@/hooks/useAuth'

export default function AdventuresPage() {
  const router = useRouter()
  const { token, checked } = useAuth()
  const { board, error, loading, refresh } = useAdventures(token)

  const back = () => router.push('/menu')

  // Тропа строится по рекордам игрока: без входа показывать нечего.
  if (checked && !token) {
    return (
      <AccessScreen
        title="Нужен вход в аккаунт"
        message={NOT_AUTHORIZED}
        actions={[
          { label: 'Войти', onClick: () => router.push('/auth') },
          { label: 'Главное меню', onClick: back },
        ]}
      />
    )
  }

  return (
    <AdventuresMap
      board={board}
      loading={loading}
      error={error}
      onBack={back}
      onPlay={(mapId) => router.push(`/game?map=${encodeURIComponent(mapId)}`)}
      onRetry={refresh}
    />
  )
}
