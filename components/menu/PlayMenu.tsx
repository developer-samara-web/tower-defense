'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { PlayerProfile } from '@/features/account/types'
import CoopPanel from './CoopPanel'
import MenuButton from './MenuButton'
import MenuShell from './MenuShell'

type Props = {
	user: PlayerProfile | null
	onBack: () => void
	onRandomMap: () => void
	onRankedMap: () => void
	rankedBusy?: boolean
	rankedError?: string | null
	initialMode?: 'root' | 'solo' | 'coop'
}

// Два уровня меню игры: выбор режима, одиночная игра и панель группы.
// Кооператив пока только интерфейс: реальные заявки появятся позже.
export default function PlayMenu({
	user,
	onBack,
	onRandomMap,
	onRankedMap,
	rankedBusy,
	rankedError,
	initialMode = 'root',
}: Props) {
	const router = useRouter()
	const [mode, setMode] = useState<'root' | 'solo' | 'coop'>(initialMode)

	if (mode === 'coop') {
		return (
			<MenuShell title="Кооперативная игра" user={user} wide>
				<CoopPanel user={user} onBack={() => setMode('root')} />
			</MenuShell>
		)
	}

	if (mode === 'solo') {
		return (
			<MenuShell title="Одиночная игра" user={user}>
				<MenuButton variant="primary" onClick={onRandomMap}>
					Обычная игра
				</MenuButton>
				<MenuButton onClick={onRankedMap} disabled={rankedBusy} badge={rankedBusy ? 'ищем карту' : 'рейтинг'}>
					Рейтинговая игра
				</MenuButton>
				{rankedError ? (
					<p className="text-center text-[9px] font-bold text-red-300">{rankedError}</p>
				) : null}
				<MenuButton onClick={() => router.push('/maps')}>Библиотека</MenuButton>
				<MenuButton onClick={() => setMode('root')}>Назад</MenuButton>
			</MenuShell>
		)
	}

	return (
		<MenuShell title="Играть" user={user}>
			<MenuButton variant="primary" onClick={() => setMode('solo')}>
				Одиночная игра
			</MenuButton>
			<MenuButton onClick={() => setMode('coop')} badge="группа">
				Кооперативная игра
			</MenuButton>
			<MenuButton onClick={onBack}>Назад</MenuButton>
		</MenuShell>
	)
}
