'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import AuthorBadge from '@/components/forum/AuthorBadge'
import type { PlayerProfile } from '@/features/account/types'
import { formatForumDate } from '@/lib/forum'
import {
	addMapComment,
	deleteMapComment,
	fetchMapComments,
} from '@/lib/services/map-comment-service'
import type { MapCommentView } from '@/types'

type Props = {
	token: string | null
	user: PlayerProfile | null
	mapId: string
	mapName: string
}

const PANEL =
	'border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(74,55,35,0.18)]'
const PRIMARY_BUTTON =
	'border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400'

// Комментарии под картой в библиотеке. Короткие отзывы без веток:
// для длинных обсуждений есть отдельная тема на форуме.
export default function MapComments({ token, user, mapId, mapName }: Props) {
	const [comments, setComments] = useState<MapCommentView[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [body, setBody] = useState('')
	const [sending, setSending] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			setComments(await fetchMapComments(mapId))
		} catch (loadError) {
			setError(
				loadError instanceof Error ? loadError.message : 'Не удалось загрузить комментарии',
			)
		} finally {
			setLoading(false)
		}
	}, [mapId])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [load])

	const isAdmin = user?.role === 'admin'

	const send = async () => {
		if (!token || sending) return
		const text = body.trim()
		if (text.length < 2) {
			setActionError('Комментарий не может быть пустым')
			return
		}

		setSending(true)
		setActionError(null)
		try {
			const comment = await addMapComment(token, mapId, text)
			setComments((prev) => [comment, ...prev])
			setBody('')
		} catch (sendError) {
			setActionError(
				sendError instanceof Error ? sendError.message : 'Не удалось отправить комментарий',
			)
		} finally {
			setSending(false)
		}
	}

	const remove = async (commentId: string) => {
		if (!token) return
		setActionError(null)
		try {
			await deleteMapComment(token, mapId, commentId)
			setComments((prev) => prev.filter((comment) => comment.id !== commentId))
		} catch (removeError) {
			setActionError(
				removeError instanceof Error ? removeError.message : 'Не удалось удалить комментарий',
			)
		}
	}

	return (
		<section className={`${PANEL} mt-3`}>
			<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a2a1a] px-3 py-2.5">
				<div>
					<h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
						Комментарии
					</h2>
					<p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
						{comments.length > 0
							? `${comments.length} отзывов о карте`
							: 'Отзывы о карте и её сложности'}
					</p>
				</div>
				<Link
					href={`/forum?tab=maps&map=${encodeURIComponent(mapId)}&mapName=${encodeURIComponent(mapName)}`}
					className="border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					Обсудить на форуме
				</Link>
			</header>

			{loading ? (
				<p className="px-3 py-6 text-center text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
					Загрузка комментариев…
				</p>
			) : error ? (
				<div className="px-3 py-6 text-center">
					<p className="text-[9px] font-bold text-red-300">{error}</p>
					<button
						type="button"
						onClick={() => void load()}
						className="mt-2 border border-[#5c3a1a] bg-[#21150c] px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
					>
						Повторить
					</button>
				</div>
			) : comments.length === 0 ? (
				<p className="px-3 py-6 text-center text-[9px] font-bold text-[#5c3a1a]">
					Комментариев пока нет — оставьте первый отзыв
				</p>
			) : (
				<ul className="divide-y divide-[#2a1d0a]">
					{comments.map((comment) => {
						const canDelete = Boolean(
							user && (comment.author.id === user.id || isAdmin),
						)
						return (
							<li key={comment.id} className="px-3 py-2.5">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<AuthorBadge
										author={comment.author}
										size={22}
										meta={formatForumDate(comment.createdAt)}
									/>
									{canDelete ? (
										<button
											type="button"
											onClick={() => void remove(comment.id)}
											className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340] transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
										>
											Удалить
										</button>
									) : null}
								</div>
								<p className="mt-1.5 whitespace-pre-wrap break-words text-[10px] font-bold leading-relaxed text-[#d9c4a0]">
									{comment.body}
								</p>
							</li>
						)
					})}
				</ul>
			)}

			<div className="border-t border-[#3a2a1a] px-3 py-3">
				{token ? (
					<>
						<textarea
							value={body}
							onChange={(event) => setBody(event.target.value)}
							rows={2}
							maxLength={2000}
							placeholder="Что думаете об этой карте?"
							className="w-full resize-none border-2 border-[#3a2a1a] bg-[#0f0a05] px-2.5 py-2 text-[10px] font-bold leading-relaxed text-[#e2c8a0] outline-none transition-colors placeholder:text-[#5c3a1a] focus:border-amber-500"
						/>
						<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
							<span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#5c3a1a]">
								{body.length} / 2000
							</span>
							<button
								type="button"
								onClick={() => void send()}
								disabled={sending || body.trim().length < 2}
								className={PRIMARY_BUTTON}
							>
								{sending ? 'Отправляем…' : 'Оставить отзыв'}
							</button>
						</div>
					</>
				) : (
					<p className="text-center text-[9px] font-bold text-[#8a7340]">
						<Link
							href="/auth"
							className="text-amber-300 underline-offset-4 transition-colors hover:text-amber-100 hover:underline"
						>
							Войдите
						</Link>
						{', чтобы оставить комментарий.'}
					</p>
				)}

				{actionError ? (
					<p className="mt-2 text-[9px] font-bold text-red-300">{actionError}</p>
				) : null}
			</div>
		</section>
	)
}
