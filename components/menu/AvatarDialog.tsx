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
import { NO_TITLE, TITLE_OPTIONS } from '@/lib/account/title-options'
import { updateProfile } from '@/lib/services/auth-service'

type Props = {
	user: PlayerProfile
	token: string | null
	onClose: () => void
	onSaved: (user: PlayerProfile) => void
}

const SECTION = 'mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#8a7340]'

const TILE =
	'flex flex-col items-center gap-1 border-2 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const TILE_ROW =
	'flex items-center border-2 px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const TILE_ON = 'border-amber-400 bg-[#3a2a12]'
const TILE_OFF = 'border-[#5c3a1a] bg-[#21150c] hover:border-[#a67c36]'

const TILE_LABEL = 'text-[7px] font-black uppercase tracking-[0.1em] text-[#c9ad74]'

// Выбор портрета, рамки и титула. Всё это сохраняется в профиле
// и сразу видно в меню, статистике игры и топе.
export default function AvatarDialog({ user, token, onClose, onSaved }: Props) {
	const [avatar, setAvatar] = useState(user.avatar ?? DEFAULT_AVATAR)
	const [frame, setFrame] = useState(user.avatarFrame ?? DEFAULT_FRAME)
	const [title, setTitle] = useState(user.title ?? NO_TITLE)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

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

	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label="Настройка профиля"
		>
			<div className="max-h-[92vh] w-full max-w-md overflow-y-auto border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
				<div className="mb-3 flex items-center justify-between border-b border-[#3a2a1a] pb-2">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
						Профиль
					</h2>
					<CloseButton onClick={onClose} label="Закрыть настройку профиля" size="md" />
				</div>

				<div className="flex items-center gap-3">
					<PlayerAvatar avatar={avatar} frame={frame} size={80} alt="Предпросмотр аватара" />
					<div className="min-w-0">
						<p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#8a7340]">Внешний вид</p>
						<p className="mt-1 truncate text-base font-black uppercase tracking-[0.08em] text-amber-200">
							{user.login}
						</p>
						{title === NO_TITLE ? (
							<p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#5c3a1a]">
								Без титула
							</p>
						) : (
							<p
								className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.14em]"
								style={{ color: TITLE_OPTIONS.find((item) => item.id === title)?.color }}
							>
								{TITLE_OPTIONS.find((item) => item.id === title)?.label}
							</p>
						)}
					</div>
				</div>

				<p className={SECTION}>Аватар</p>
				<div className="mt-1.5 grid grid-cols-5 gap-1.5">
					{AVATAR_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => setAvatar(option.id)}
							aria-pressed={avatar === option.id}
							aria-label={`Аватар: ${option.label}`}
							className={`${TILE} ${avatar === option.id ? TILE_ON : TILE_OFF}`}
						>
							<PlayerAvatar avatar={option.id} frame={null} size={48} alt="" bordered={false} />
							<span className={TILE_LABEL}>{option.label}</span>
						</button>
					))}
				</div>

				<p className={SECTION}>Рамка</p>
				<div className="mt-1.5 grid grid-cols-5 gap-1.5">
					{FRAME_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => setFrame(option.id)}
							aria-pressed={frame === option.id}
							aria-label={`Рамка: ${option.label}`}
							className={`${TILE} ${frame === option.id ? TILE_ON : TILE_OFF}`}
						>
							<PlayerAvatar
								avatar={avatar}
								frame={option.id === 'none' ? null : option.id}
								size={48}
								alt=""
								bordered={false}
							/>
							<span className={TILE_LABEL}>{option.label}</span>
						</button>
					))}
				</div>

				<p className={SECTION}>Титул</p>
				<div className="mt-1.5 grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onClick={() => setTitle(NO_TITLE)}
						aria-pressed={title === NO_TITLE}
						className={`${TILE_ROW} ${title === NO_TITLE ? TILE_ON : TILE_OFF}`}
					>
						<span className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8a7340]">
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
								className="truncate text-[9px] font-black uppercase tracking-[0.1em]"
								style={{ color: option.color }}
							>
								{option.label}
							</span>
						</button>
					))}
				</div>

				{error ? (
					<p className="mt-3 text-center text-[9px] font-bold text-red-300">{error}</p>
				) : null}

				<div className="mt-4 flex justify-end gap-2">
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
