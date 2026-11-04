'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import AuthorBadge from '@/components/forum/AuthorBadge'
import { formatForumDate, forumCategoryLabel } from '@/lib/forum'
import {
	createForumPost,
	deleteForumPost,
	deleteForumThread,
	fetchForumThread,
} from '@/lib/services/forum-service'
import type { PlayerProfile } from '@/features/account/types'
import type { ForumThreadDetail } from '@/types'

type Props = {
	threadId: string
	token: string | null
	user: PlayerProfile | null
	onBack: () => void
	onDeleted: () => void
}

const PANEL =
	'border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(74,55,35,0.18)]'
const DARK_BUTTON =
	'border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
const DANGER_BUTTON =
	'border-2 border-[#7f2d24] bg-[#2a0f0a] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-200 shadow-[0_2px_0_#100904] transition-colors hover:border-red-500 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'
const PRIMARY_BUTTON =
	'border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400'
const TEXTAREA =
	'w-full resize-none border-2 border-[#3a2a1a] bg-[#0f0a05] px-2.5 py-2 text-[11px] font-bold leading-relaxed text-[#e2c8a0] outline-none transition-colors placeholder:text-[#5c3a1a] focus:border-amber-500'

// Тема форума: стартовое сообщение, ответы и форма ответа.
// Гость читает всё, но не может писать — вместо формы видит ссылку на вход.
export default function ForumThreadView({
	threadId,
	token,
	user,
	onBack,
	onDeleted,
}: Props) {
	const [thread, setThread] = useState<ForumThreadDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [reply, setReply] = useState('')
	const [sending, setSending] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [deleting, setDeleting] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			setThread(await fetchForumThread(threadId))
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить тему')
		} finally {
			setLoading(false)
		}
	}, [threadId])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [load])

	const isAdmin = user?.role === 'admin'
	const canDeleteThread = Boolean(
		thread && user && (thread.author.id === user.id || isAdmin),
	)

	const sendReply = async () => {
		if (!token || sending) return
		const text = reply.trim()
		if (text.length < 2) {
			setActionError('Сообщение не может быть пустым')
			return
		}

		setSending(true)
		setActionError(null)
		try {
			const post = await createForumPost(token, threadId, text)
			setThread((prev) =>
				prev
					? { ...prev, posts: [...prev.posts, post], postCount: prev.postCount + 1 }
					: prev,
			)
			setReply('')
		} catch (sendError) {
			setActionError(
				sendError instanceof Error ? sendError.message : 'Не удалось отправить сообщение',
			)
		} finally {
			setSending(false)
		}
	}

	const removePost = async (postId: string) => {
		if (!token) return
		setActionError(null)
		try {
			await deleteForumPost(token, postId)
			setThread((prev) =>
				prev
					? {
							...prev,
							posts: prev.posts.filter((post) => post.id !== postId),
							postCount: Math.max(0, prev.postCount - 1),
						}
					: prev,
			)
		} catch (removeError) {
			setActionError(
				removeError instanceof Error ? removeError.message : 'Не удалось удалить сообщение',
			)
		}
	}

	const removeThread = async () => {
		if (!token || deleting) return
		setDeleting(true)
		setActionError(null)
		try {
			await deleteForumThread(token, threadId)
			onDeleted()
		} catch (removeError) {
			setActionError(
				removeError instanceof Error ? removeError.message : 'Не удалось удалить тему',
			)
			setDeleting(false)
		}
	}

	if (loading) {
		return (
			<div className={`${PANEL} px-4 py-10 text-center`}>
				<p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a7340]">
					Загрузка темы…
				</p>
			</div>
		)
	}

	if (error || !thread) {
		return (
			<div className={`${PANEL} px-4 py-8 text-center`}>
				<p className="text-[10px] font-bold text-red-300">{error ?? 'Тема не найдена'}</p>
				<div className="mt-3 flex justify-center gap-2">
					<button type="button" onClick={() => void load()} className={DARK_BUTTON}>
						Повторить
					</button>
					<button type="button" onClick={onBack} className={DARK_BUTTON}>
						К темам
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			<button type="button" onClick={onBack} className={DARK_BUTTON}>
				<span className="mr-1 text-[13px] leading-none">←</span>
				К темам
			</button>

			<article className={PANEL}>
				<header className="border-b border-[#3a2a1a] px-3 py-2.5">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="border border-amber-600/70 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-300">
							{forumCategoryLabel(thread.category)}
						</span>
						{thread.pinned ? (
							<span className="border border-lime-600/70 bg-lime-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-lime-300">
								Закреплено
							</span>
						) : null}
						{thread.map ? (
							<span className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-[#c9b491]">
								Карта: {thread.map.name}
							</span>
						) : null}
					</div>

					<h1 className="mt-2 break-words text-lg font-black uppercase tracking-[0.08em] text-amber-200">
						{thread.title}
					</h1>

					<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
						<AuthorBadge
							author={thread.author}
							meta={formatForumDate(thread.createdAt)}
						/>
						<span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
							{thread.postCount} ответов
						</span>
					</div>
				</header>

				<p className="whitespace-pre-wrap break-words px-3 py-3 text-[11px] font-bold leading-relaxed text-[#d9c4a0]">
					{thread.body}
				</p>

				{canDeleteThread ? (
					<div className="flex flex-wrap justify-end gap-2 border-t border-[#3a2a1a] px-3 py-2">
						{confirmDelete ? (
							<>
								<button
									type="button"
									onClick={() => void removeThread()}
									disabled={deleting}
									className={DANGER_BUTTON}
								>
									{deleting ? 'Удаляем…' : 'Точно удалить?'}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									disabled={deleting}
									className={DARK_BUTTON}
								>
									Отмена
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={() => setConfirmDelete(true)}
								className={DANGER_BUTTON}
							>
								Удалить тему
							</button>
						)}
					</div>
				) : null}
			</article>

			<section className={PANEL}>
				<header className="flex items-center justify-between gap-2 border-b border-[#3a2a1a] px-3 py-2">
					<h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
						Ответы
					</h2>
					<span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
						{thread.posts.length}
					</span>
				</header>

				{thread.posts.length === 0 ? (
					<p className="px-3 py-6 text-center text-[9px] font-bold text-[#5c3a1a]">
						Ответов пока нет — начните разговор
					</p>
				) : (
					<ul className="divide-y divide-[#2a1d0a]">
						{thread.posts.map((post) => {
							const canDelete = Boolean(user && (post.author.id === user.id || isAdmin))
							return (
								<li key={post.id} className="px-3 py-2.5">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<AuthorBadge
											author={post.author}
											meta={formatForumDate(post.createdAt)}
										/>
										{canDelete ? (
											<button
												type="button"
												onClick={() => void removePost(post.id)}
												className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340] transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
											>
												Удалить
											</button>
										) : null}
									</div>
									<p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] font-bold leading-relaxed text-[#d9c4a0]">
										{post.body}
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
								value={reply}
								onChange={(event) => setReply(event.target.value)}
								rows={3}
								maxLength={4000}
								placeholder="Ваш ответ…"
								className={TEXTAREA}
							/>
							<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
								<span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#5c3a1a]">
									{reply.length} / 4000
								</span>
								<button
									type="button"
									onClick={() => void sendReply()}
									disabled={sending || reply.trim().length < 2}
									className={PRIMARY_BUTTON}
								>
									{sending ? 'Отправляем…' : 'Ответить'}
								</button>
							</div>
						</>
					) : (
						<p className="text-center text-[10px] font-bold text-[#8a7340]">
							<Link
								href="/auth"
								className="text-amber-300 underline-offset-4 transition-colors hover:text-amber-100 hover:underline"
							>
								Войдите
							</Link>
							{', чтобы ответить в теме.'}
						</p>
					)}

					{actionError ? (
						<p className="mt-2 text-[9px] font-bold text-red-300">{actionError}</p>
					) : null}
				</div>
			</section>
		</div>
	)
}
