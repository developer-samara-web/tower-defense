'use client'

import { useRouter } from 'next/navigation'

import AuthRequiredScreen from '@/components/auth/AuthRequiredScreen'
import TowerScreen from '@/components/menu/TowerScreen'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

export default function TowerPage() {
	const router = useRouter()
	const { user, checked } = useAuth()

	// Этажи общие, но прогресс и валюта привязаны к аккаунту: гостю
	// башня недоступна, как и остальные режимы.
	if (!checked) return <LoadingScreen message="Проверяем сессию…" />
	if (!user) return <AuthRequiredScreen />

	return (
		<TowerScreen
			user={user}
			onBack={() => router.push('/menu')}
			onPlay={(floor) => router.push(`/game?tower=${floor}`)}
		/>
	)
}
