import { Suspense } from 'react'

import PlayPageClient from './PlayPageClient'

// Режим меню читается из URL на клиенте, поэтому страница
// должна находиться внутри Suspense-границы.
export default function PlayPage() {
	return (
		<Suspense fallback={<PlayLoading />}>
			<PlayPageClient />
		</Suspense>
	)
}

function PlayLoading() {
	return (
		<main className="flex h-[100dvh] w-full items-center justify-center bg-[url(/game/background.png)] bg-cover bg-center font-mono">
			<p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
				Загрузка…
			</p>
		</main>
	)
}
