'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

type Props = {
	className?: string
	children: ReactNode
}

// Главная кнопка лендинга. Токен лежит в localStorage, поэтому решение
// «продолжить или войти» принимается по клику: серверный рендер о сессии
// ничего не знает и не должен мигать чужой кнопкой.
export default function LandingPlayButton({ className = '', children }: Props) {
	const router = useRouter()

	const play = () => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
		router.push(token ? '/menu' : '/auth')
	}

	return (
		<button type="button" onClick={play} className={className}>
			{children}
		</button>
	)
}
