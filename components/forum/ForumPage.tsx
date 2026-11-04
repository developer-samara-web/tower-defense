'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import AuthorBadge from '@/components/forum/AuthorBadge'
import ForumReleaseFeed from '@/components/forum/ForumReleaseFeed'
import ForumThreadView from '@/components/forum/ForumThreadView'
import LandingPlayButton from '@/components/landing/LandingPlayButton'
import { useAuth } from '@/hooks/useAuth'
import {
	FORUM_TABS,
	formatForumDate,
	forumCategoryLabel,
	forumTab,
	readForumCategory,
} from '@/lib/forum'
import { createForumThread, fetchForumThreads } from '@/lib/services/forum-service'
import type { ForumCategory, ForumThreadSummary } from '@/types'

const PANEL =
	'border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(74,55,35,0.18)]'
const DARK_BUTTON =
	'border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
const PRIMARY_BUTTON =
	'border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400'
const FIELD =
	'w-full border-2 border-[#3a2a1a] bg-[#0f0a05] px-2.5 py-2 text-[11px] font-bold text-[#e2c8a0] outline-none transition-colors placeholder:text-[#5c3a1a] focus:border-amber-500'

type ThreadMap = { id: string; name: string }

// Мини-форум: три вкладки, лента тем и форма новой темы.
// Чтение открыто всем, запись требует входа — как в остальной игре.
export default function ForumPage() {
	const searchParams = useSearchParams()
	const { token, user } = useAuth()

	const initialTab = readForumCategory(searchParams.get('tab')) ?? 'updates'
	const mapParam = searchParams.get('map')?.trim() || ''
	const mapNameParam = searchParams.get('mapName')?.trim() || ''

	const [tab, setTab] = useState<ForumCategory>(initialTab)
	const [threads, setThreads] = useState<ForumThreadSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [openThreadId, setOpenThreadId] = useState<string | null>(
		searchParams.get('thread'),
	)

	const [composerOpen, setComposerOpen] = useState(Boolean(mapParam))
	const [threadMap, setThreadMap] = useState<ThreadMap | null>(
		mapParam ? { id: mapParam, name: mapNameParam || 'Карта сообщества' } : null,
	)
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			setThreads(await fetchForumThreads(tab))
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить форум')
		} finally {
			setLoading(false)
		}
	}, [tab])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [load])

	const changeTab = (next: ForumCategory) => {
		if (next === tab) return
		setTab(next)
		setComposerOpen(false)
		setFormError(null)
		if (next !== 'maps') setThreadMap(null)
	}

	const openComposer = () => {
		if (!token) return
		setComposerOpen(true)
		setFormError(null)
	}

	const closeComposer = () => {
		setComposerOpen(false)
		setFormError(null)
	}

	const submitThread = async () => {
		if (!token || submitting) return

		const nextTitle = title.trim()
		const nextBody = body.trim()
		if (nextTitle.length < 3) {
			setFormError('Заголовок должен быть от 3 до 120 символов')
			return
		}
		if (nextBody.length < 2) {
			setFormError('Сообщение не может быть пустым')
			return
		}

		setSubmitting(true)
		setFormError(null)
		try {
			const created = await createForumThread(token, {
				category: tab,
				title: nextTitle,
				body: nextBody,
				mapId: tab === 'maps' ? threadMap?.id ?? null : null,
			})

			setThreads((prev) => [created, ...prev])
			setTitle('')
			setBody('')
			setThreadMap(null)
			setComposerOpen(false)
			setOpenThreadId(created.id)
		} catch (submitError) {
			setFormError(
				submitError instanceof Error ? submitError.message : 'Не удалось создать тему',
			)
		} finally {
			setSubmitting(false)
		}
	}

	const activeTab = forumTab(tab)

	return (
		<main className="relative w-full overflow-x-clip bg-[url(/ui/background.png)] bg-cover bg-center bg-fixed font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="fixed inset-0 z-0 bg-gradient-to-b from-[#05080a]/88 via-[#0a0e12]/82 to-[#05080a]/92" />

			<header className="sticky top-0 z-50 bg-gradient-to-b from-black/90 via-black/45 to-transparent">
				<div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4">
					<Link
						href="/"
						className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
					>
						<Image
							src="/ui/logo-mini.png"
							alt=""
							width={36}
							height={36}
							className="h-9 w-9 shrink-0 object-contain"
						/>
						<span className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
							TowerForce · Форум
						</span>
					</Link>

					<div className="flex shrink-0 items-center gap-2">
						<Link
							href="/updates"
							className="hidden border-2 border-[#79502b] bg-[#21150c] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:inline-flex"
						>
							Обновления
						</Link>
						<LandingPlayButton className="border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400">
							Играть
						</LandingPlayButton>
					</div>
				</div>
			</header>

			<div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
				<div className="max-w-2xl">
					<span className="text-[10px] font-black uppercase tracking-[0.34em] text-[#8a7340]">
						Сообщество
					</span>
					<h1 className="mt-2 text-3xl font-black uppercase tracking-[0.14em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e] sm:text-4xl">
						Форум TowerForce
					</h1>
					<p className="mt-3 text-[13px] font-bold leading-relaxed text-[#b5a17b] sm:text-sm">
						Обновления, баланс, башни, волны и карты сообщества. Читать может
						любой, писать — после входа в аккаунт.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<span className="inline-flex items-center gap-1.5 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#c9b491]">
							{threads.length} тем в разделе
						</span>
						<span className="inline-flex items-center gap-1.5 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#c9b491]">
							{user ? `Вы: ${user.login}` : 'Чтение открыто всем'}
						</span>
					</div>
				</div>

				<div className="mt-8 flex flex-wrap gap-1 border-b border-[#3a2a1a] pb-1.5">
					{FORUM_TABS.map((item) => {
						const active = tab === item.id
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => changeTab(item.id)}
								aria-pressed={active}
								className={`border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${
									active
										? 'border-amber-500 bg-[#3a2a12] text-amber-100'
										: 'border-[#3a2a1a] bg-[#161009] text-[#8a7340] hover:border-[#79502b] hover:text-amber-200'
								}`}
							>
								{item.label}
							</button>
						)
					})}
				</div>

				{openThreadId ? (
					<div className="mt-5">
						<ForumThreadView
							threadId={openThreadId}
							token={token}
							user={user}
							onBack={() => setOpenThreadId(null)}
							onDeleted={() => {
								setOpenThreadId(null)
								void load()
							}}
						/>
					</div>
				) : (
					<>
						{tab === 'updates' ? <ForumReleaseFeed /> : null}

						<section className={`${PANEL} mt-5`}>
							<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a2a1a] px-3 py-2.5">
								<div>
									<h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
										{activeTab.label}
									</h2>
									<p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
										{activeTab.hint}
									</p>
								</div>
								{token ? (
									<button type="button" onClick={openComposer} className={PRIMARY_BUTTON}>
										Новая тема
									</button>
								) : (
									<Link
										href="/auth"
										className="border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
									>
										Войти, чтобы писать
									</Link>
								)}
							</header>

							{composerOpen && token ? (
								<div className="border-b border-[#3a2a1a] px-3 py-3">
									{threadMap ? (
										<div className="mb-2 flex flex-wrap items-center gap-2">
											<span className="border border-amber-600/70 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-300">
												Тема о карте: {threadMap.name}
											</span>
											<button
												type="button"
												onClick={() => setThreadMap(null)}
												className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340] transition-colors hover:text-red-300"
											>
												Убрать карту
											</button>
										</div>
									) : null}

									<input
										value={title}
										onChange={(event) => setTitle(event.target.value)}
										maxLength={120}
										placeholder="Заголовок темы"
										className={FIELD}
									/>
									<textarea
										value={body}
										onChange={(event) => setBody(event.target.value)}
										rows={4}
										maxLength={4000}
										placeholder="О чём поговорим?"
										className={`${FIELD} mt-2 resize-none leading-relaxed`}
									/>
									<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
										<span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#5c3a1a]">
											{title.length} / 120 · {body.length} / 4000
										</span>
										<span className="flex gap-2">
											<button type="button" onClick={closeComposer} className={DARK_BUTTON}>
												Отмена
											</button>
											<button
												type="button"
												onClick={() => void submitThread()}
												disabled={submitting}
												className={PRIMARY_BUTTON}
											>
												{submitting ? 'Создаём…' : 'Создать тему'}
											</button>
										</span>
									</div>
									{formError ? (
										<p className="mt-2 text-[9px] font-bold text-red-300">{formError}</p>
									) : null}
								</div>
							) : null}

							{loading ? (
								<p className="px-3 py-8 text-center text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
									Загрузка тем…
								</p>
							) : error ? (
								<div className="px-3 py-8 text-center">
									<p className="text-[9px] font-bold text-red-300">{error}</p>
									<button
										type="button"
										onClick={() => void load()}
										className={`${DARK_BUTTON} mt-2`}
									>
										Повторить
									</button>
								</div>
							) : threads.length === 0 ? (
								<p className="px-3 py-8 text-center text-[9px] font-bold text-[#5c3a1a]">
									{token
										? 'В этом разделе пока нет тем. Создайте первую.'
										: 'В этом разделе пока нет тем. Войдите, чтобы начать обсуждение.'}
								</p>
							) : (
								<ul className="divide-y divide-[#2a1d0a]">
									{threads.map((thread) => (
										<li key={thread.id}>
											<button
												type="button"
												onClick={() => setOpenThreadId(thread.id)}
												className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#21150c]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
											>
												<span className="min-w-0 flex-1">
													<span className="flex flex-wrap items-center gap-1.5">
														{thread.pinned ? (
															<span className="border border-lime-600/70 bg-lime-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-lime-300">
																Закреплено
															</span>
														) : null}
														<span className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-[#c9b491]">
															{forumCategoryLabel(thread.category)}
														</span>
														{thread.map ? (
															<span className="border border-amber-600/50 bg-amber-500/5 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-amber-300">
																Карта: {thread.map.name}
															</span>
														) : null}
													</span>

													<span className="mt-1 block truncate text-[11px] font-black uppercase tracking-[0.06em] text-amber-200">
														{thread.title}
													</span>
													<span className="mt-0.5 line-clamp-2 block text-[10px] font-bold leading-snug text-[#8a7340]">
														{thread.body}
													</span>

													<span className="mt-1.5 flex flex-wrap items-center gap-2">
														<AuthorBadge
															author={thread.author}
															size={20}
															meta={formatForumDate(thread.createdAt)}
														/>
													</span>
												</span>

												<span className="shrink-0 text-right">
													<span className="block text-[14px] font-black tabular-nums text-amber-300">
														{thread.postCount}
													</span>
													<span className="block text-[7px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
														ответов
													</span>
													<span className="mt-1 block text-[7px] font-bold uppercase tracking-[0.1em] text-[#5c3a1a]">
														{formatForumDate(thread.lastPostAt)}
													</span>
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</section>
					</>
				)}

				<footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[#3a2a1a]/80 pt-4 text-[9px] font-black uppercase tracking-[0.18em] text-[#8a7340] sm:flex-row">
					<span>© TowerForce</span>
					<span className="flex items-center gap-3">
						<Link href="/" className="transition-colors hover:text-amber-300">
							На главную
						</Link>
						<Link href="/updates" className="transition-colors hover:text-amber-300">
							Обновления
						</Link>
						<Link href="/leaderboard" className="transition-colors hover:text-amber-300">
							Топ
						</Link>
					</span>
				</footer>
			</div>
		</main>
	)
}
