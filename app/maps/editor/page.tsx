'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import MapEditor from '@/components/map-editor/MapEditor'

function EditorRoute() {
	const params = useSearchParams()
	const mapId = params.get('id')?.trim() ?? ''

	return <MapEditor mapId={mapId} />
}

export default function MapEditorPage() {
	return (
		<Suspense
			fallback={
				<main className="flex h-[100dvh] w-full items-center justify-center bg-[#05080a] font-mono">
					<p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
						Загрузка редактора…
					</p>
				</main>
			}
		>
			<EditorRoute />
		</Suspense>
	)
}
