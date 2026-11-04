import { Suspense } from 'react'
import type { Metadata } from 'next'

import ForumPage from '@/components/forum/ForumPage'

export const metadata: Metadata = {
	title: 'Форум — TowerForce',
	description:
		'Мини-форум TowerForce: обновления, обсуждение игры, баланса и карт сообщества. Чтение открыто всем, писать можно после входа.',
}

export default function ForumRoute() {
	return (
		<Suspense fallback={<ForumLoading />}>
			<ForumPage />
		</Suspense>
	)
}

function ForumLoading() {
	return (
		<main className="flex min-h-[100dvh] w-full items-center justify-center bg-[url(/ui/background.png)] bg-cover bg-center font-mono">
			<div className="fixed inset-0 bg-[#05080a]/85" />
			<p className="relative text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
				Загрузка форума…
			</p>
		</main>
	)
}
