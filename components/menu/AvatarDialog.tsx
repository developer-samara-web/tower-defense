'use client'

import { useState } from 'react'

import CloseButton from '@/components/ui/CloseButton'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import type { PlayerProfile } from '@/features/account/types'
import {
	AVATAR_OPTIONS,
	DEFAULT_AVATAR,
	DEFAULT_FRAME,
	FRAME_OPTIONS,
} from '@/lib/account/avatar-options'
import { NO_TITLE, TITLE_OPTIONS, titleOption } from '@/lib/account/title-options'
import { updateProfile } from '@/lib/services/auth-service'

type Props = {
	user: PlayerProfile
	token: string | null
	onClose: () => void
	onSaved: (user: PlayerProfile) => void
}

type TabId = 'avatar' | 'frame' | 'title'

// Секции вынесены в табы: вместе они не помещались, и игроку приходилось
// прокручивать длинный список. Порядок — от лица к статусу.
const TABS: Array<{ id: TabId; label: string; controls: string }> = [
	{ id: 'avatar', label: 'Аватар', controls: 'profile-tab-avatar' },
	{ id: 'frame', label: 'Рамка', controls: 'profile-tab-frame' },
	{ id: 'title', label: 'Титул', controls: 'profile-tab-title' },
]

const TILE =
	'flex flex-col items-center gap-1 border-2 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const TILE_ROW =
	'flex items-center gap-2 border-2 px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const TILE_ON = 'border-amber-400 bg-[#3a2a12]'
const TILE_OFF = 'border-[#5c3a1a] bg-[#21150c] hover:border-[#a67c36]'

const TILE_LABEL = 'text-[7px] font-black uppercase tracking-[0.1em] text-[#c9ad74]'

// Выбор портрета, рамки и титула. Всё это сохраняется в профиле
// и сразу видно в меню, статистике игры и топе.
export default function AvatarDialog({ user, token, onClose, onSaved }: Props) {
	const [tab, setTab] = useState<TabId>('avatar')
	const [avatar, setAvatar] = useState(user.avatar ?? DEFAULT_AVATAR)
	const [frame, setFrame] = useState(user.avatarFrame ?? DEFAULT_FRAME)
	const [title, setTitle] = useState(user.title ?? NO_TITLE)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const selectedTitle = titleOption(title)

	const save = async () => {
		if (!token || saving) return
		setSaving(true)
		setError(null)
		try {
			const updated = (await updateProfile(token, {
				avatar,
				avatarFrame: frame,
				title,
			})) as PlayerProfile
			onSaved(updated)
			onClose()
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить')
			setSaving(false)
		}
	}

	// Табы без переключения с клавиатуры были бы недоступны: мышью по ним
	// играют как по обычным кнопкам, а скринридер ждёт стрелок.
	const onTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
		if (delta === 0) return
		event.preventDefault()
		const index = TABS.findIndex((item) => item.id === tab)
		const next = (index + delta + TABS.length) % TABS.length
		setTab(TABS[next].id)
		event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${TABS[next].id}"]`)?.focus()
	}

	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label="Настройка профиля"
		>
			<div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_0_30px_rgba(0,0,0,0.9)]">
				<div className="flex shrink-0 items-center justify-between border-b border-[#3a2a1a] px-4 py-3">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
						Настройка профиля
					</h2>
					<CloseButton onClick={onClose} label="Закрыть настройку профиля" size="md" />
				</div>

				<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-[196px_minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)]">
					{/* Живой предпросмотр: игрок видит итог до сохранения, а не только плитку. */}
					<div className="flex flex-col items-center border-2 border-[#3a2a1a] bg-[#0f0a05]/70 px-3 py-4 sm:sticky sm:top-0">
						<PlayerAvatar avatar={avatar} frame={frame} size={132} alt="Предпросмотр аватара" />
						<p className="mt-3 max-w-full truncate text-base font-black uppercase tracking-[0.08em] text-amber-200">
							{user.login}
						</p>
						<span
							className="mt-1 inline-flex max-w-full items-center border-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em]"
							style={
								selectedTitle
									? {
											borderColor: selectedTitle.color,
											color: selectedTitle.color,
											textShadow: `0 0 6px ${selectedTitle.color}55`,
										}
									: { borderColor: '#5c3a1a', color: '#8a7340' }
							}
						>
							<span className="truncate">{selectedTitle?.label || 'Без титула'}</span>
						</span>
						<p className="mt-3 text-center text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">
							{tab === 'avatar' ? 'Портрет' : tab === 'frame' ? 'Рамка портрета' : 'Титул под ником'}
						</p>
					</div>

					<div className="flex min-w-0 flex-col">
						<div
							role="tablist"
							aria-label="Раздел настройки профиля"
							onKeyDown={onTabListKeyDown}
							className="flex gap-1 border-b-2 border-[#3a2a1a] pb-2"
						>
							{TABS.map((item) => (
								<button
									key={item.id}
									type="button"
									data-tab={item.id}
									role="tab"
									id={`profile-tab-${item.id}`}
									aria-selected={tab === item.id}
									aria-controls={item.controls}
									tabIndex={tab === item.id ? 0 : -1}
									onClick={() => setTab(item.id)}
									className={`flex-1 border-2 px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
										tab === item.id
											? 'border-amber-400 bg-[#3a2a12] text-amber-100'
											: 'border-[#5c3a1a] bg-[#21150c] text-[#a68a52] hover:border-[#a67c36] hover:text-amber-200'
									}`}
								>
									{item.label}
								</button>
							))}
						</div>

						{tab === 'avatar' ? (
							<div
								role="tabpanel"
								id="profile-tab-avatar"
								aria-labelledby="profile-tab-avatar"
								tabIndex={-1}
								className="mt-3 grid grid-cols-4 gap-2 focus-visible:outline-none sm:grid-cols-5"
							>
								{AVATAR_OPTIONS.map((option) => (
									<button
										key={option.id}
										type="button"
										onClick={() => setAvatar(option.id)}
										aria-pressed={avatar === option.id}
										aria-label={`Аватар: ${option.label}`}
										className={`${TILE} ${avatar === option.id ? TILE_ON : TILE_OFF}`}
									>
										<PlayerAvatar avatar={option.id} frame={null} size={56} alt="" bordered={false} />
										<span className={TILE_LABEL}>{option.label}</span>
									</button>
								))}
							</div>
						) : null}

						{tab === 'frame' ? (
							<div
								role="tabpanel"
								id="profile-tab-frame"
								aria-labelledby="profile-tab-frame"
								tabIndex={-1}
								className="mt-3 grid grid-cols-4 gap-2 focus-visible:outline-none sm:grid-cols-5"
							>
								{FRAME_OPTIONS.map((option) => (
									<button
										key={option.id}
										type="button"
										onClick={() => setFrame(option.id)}
										aria-pressed={frame === option.id}
										aria-label={`Рамка: ${option.label}`}
										className={`${TILE} ${frame === option.id ? TILE_ON : TILE_OFF}`}
									>
										{/* Превью берёт выбранный портрет: так рамка видна именно на нём. */}
										<PlayerAvatar
											avatar={avatar}
											frame={option.id === 'none' ? null : option.id}
											size={56}
											alt=""
											bordered={false}
										/>
										<span className={TILE_LABEL}>{option.label}</span>
									</button>
								))}
							</div>
						) : null}

						{tab === 'title' ? (
							<div
								role="tabpanel"
								id="profile-tab-title"
								aria-labelledby="profile-tab-title"
								tabIndex={-1}
								className="mt-3 grid grid-cols-1 gap-2 focus-visible:outline-none sm:grid-cols-2"
							>
								<button
									type="button"
									onClick={() => setTitle(NO_TITLE)}
									aria-pressed={title === NO_TITLE}
									className={`${TILE_ROW} ${title === NO_TITLE ? TILE_ON : TILE_OFF}`}
								>
									<span className="h-2.5 w-2.5 shrink-0 border border-[#5c3a1a] bg-[#0f0a05]" />
									<span className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-[#8a7340]">
										Без титула
									</span>
								</button>
								{TITLE_OPTIONS.map((option) => (
									<button
										key={option.id}
										type="button"
										onClick={() => setTitle(option.id)}
										aria-pressed={title === option.id}
										className={`${TILE_ROW} ${title === option.id ? TILE_ON : TILE_OFF}`}
									>
										<span
											className="h-2.5 w-2.5 shrink-0"
											style={{ backgroundColor: option.color, boxShadow: `0 0 8px ${option.color}` }}
										/>
										<span
											className="truncate text-[9px] font-black uppercase tracking-[0.1em]"
											style={{ color: option.color }}
										>
											{option.label}
										</span>
									</button>
								))}
							</div>
						) : null}
					</div>
				</div>

				<div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#3a2a1a] px-4 py-3">
					{error ? (
						<p className="mr-auto text-left text-[9px] font-bold text-red-300">{error}</p>
					) : null}
					<button
						type="button"
						onClick={onClose}
						className="border-2 border-[#5c3a1a] bg-[#21150c] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => void save()}
						disabled={saving || !token}
						className="border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
					>
						{saving ? 'Сохраняем…' : 'Сохранить'}
					</button>
				</div>
			</div>
		</div>
	)
}
