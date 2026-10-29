'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { PlayerProfile } from '@/features/account/types'
import MenuButton from './MenuButton'
import MenuShell from './MenuShell'

type Props = {
	user: PlayerProfile | null
	token?: string | null
	onUserChange?: (user: PlayerProfile) => void
	onBack: () => void
	onRandomMap: () => void
	initialMode?: 'root' | 'solo'
}

// Два уровня меню игры: выбор режима и одиночная игра.
// Рейтинговые матчи и кооператив пока выключены.
export default function PlayMenu({
	user,
	token,
	onUserChange,
	onBack,
	onRandomMap,
	initialMode = 'root',
}: Props) {
	const router = useRouter()
	const [mode, setMode] = useState<'root' | 'solo'>(initialMode)

	if (mode === 'solo') {
		return (
			<MenuShell title="Одиночная игра" user={user} token={token} onUserChange={onUserChange}>
				<MenuButton variant="primary" onClick={onRandomMap}>
					Обычная игра
				</MenuButton>
				<MenuButton disabled badge="скоро">
					Рейтинговая игра
				</MenuButton>
				<MenuButton onClick={() => router.push('/maps')}>Библиотека</MenuButton>
				<MenuButton onClick={() => setMode('root')}>Назад</MenuButton>
			</MenuShell>
		)
	}

	return (
		<MenuShell title="Играть" user={user} token={token} onUserChange={onUserChange}>
			<MenuButton variant="primary" onClick={() => setMode('solo')}>
				Одиночная игра
			</MenuButton>
			<MenuButton disabled badge="скоро">
				Кооперативная игра
			</MenuButton>
			<MenuButton onClick={onBack}>Назад</MenuButton>
		</MenuShell>
	)
}
