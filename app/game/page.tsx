import { Suspense } from 'react'

import GamePageClient from './GamePageClient'

// Сид карты читается из URL на клиенте, поэтому игровая страница
// должна находиться внутри Suspense-границы.
export default function GamePage() {
	return (
		<Suspense fallback={<GameLoading />}>
			<GamePageClient />
		</Suspense>
	)
}

function GameLoading() {
	return (
		<main className="flex h-[100dvh] w-full items-center justify-center bg-[#4a7f2a] font-mono">
			<p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
				Загрузка карты…
			</p>
		</main>
	)
}
