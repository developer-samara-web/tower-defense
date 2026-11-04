'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import ScoreTable from '@/components/menu/ScoreTable'
import { fetchTopScores } from '@/lib/services/score-service'
import type { PlayerScore } from '@/features/account/types'

type Props = {
	limit?: number
}

// Топ на лендинге грузится отдельно от страницы: главная остаётся
// статической, а таблица обновляется из того же API, что и меню.
export default function LandingLeaderboard({ limit = 6 }: Props) {
	const [scores, setScores] = useState<PlayerScore[] | null>(null)

	useEffect(() => {
		let alive = true

		fetchTopScores(limit)
			.then((rows: PlayerScore[]) => {
				if (alive) setScores(rows)
			})
			.catch(() => {
				if (alive) setScores([])
			})

		return () => {
			alive = false
		}
	}, [limit])

	if (!scores) {
		return (
			<div className="divide-y divide-[#2a1d0a]" aria-hidden="true">
				{Array.from({ length: limit }).map((_, index) => (
					<div key={index} className="flex items-center gap-3 px-3 py-2.5">
						<span className="h-3 w-4 animate-pulse bg-[#2a1d0a]" />
						<span className="h-7 w-7 animate-pulse bg-[#2a1d0a]" />
						<span className="h-3 flex-1 animate-pulse bg-[#2a1d0a]" />
						<span className="h-3 w-16 animate-pulse bg-[#2a1d0a]" />
					</div>
				))}
			</div>
		)
	}

	if (scores.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
				<p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
					Пока нет рейтинговых забегов
				</p>
				<Link
					href="/auth"
					className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-300 underline-offset-4 transition-colors hover:text-amber-100 hover:underline"
				>
					Стать первым в топе
				</Link>
			</div>
		)
	}

	return <ScoreTable scores={scores} />
}
