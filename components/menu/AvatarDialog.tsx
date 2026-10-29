'use client'

import Image from 'next/image'
import { useState } from 'react'

import CloseButton from '@/components/ui/CloseButton'
import type { PlayerProfile } from '@/features/account/types'
import {
	AVATAR_OPTIONS,
	FRAME_OPTIONS,
	avatarSrc,
	frameSrc,
} from '@/lib/account/avatar-options'
import { updateProfile } from '@/lib/services/auth-service'

type Props = {
	user: PlayerProfile
	token: string | null
	onClose: () => void
	onSaved: (user: PlayerProfile) => void
}

// Пока это заглушки: все варианты показывают одинаковую картинку,
// но выбранные id уже сохраняются в профиле.
export default function AvatarDialog({ user, token, onClose, onSaved }: Props) {
	const [avatar, setAvatar] = useState(user.avatar ?? 'default')
	const [frame, setFrame] = useState(user.avatarFrame ?? 'none')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const previewFrame = frameSrc(frame)

	const save = async () => {
		if (!token || saving) return
		setSaving(true)
		setError(null)
		try {
			const updated = (await updateProfile(token, {
				avatar,
				avatarFrame: frame,
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
			aria-label="Настройка аватара"
		>
			<div className="max-h-[92vh] w-full max-w-md overflow-y-auto border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
				<div className="mb-3 flex items-center justify-between border-b border-[#3a2a1a] pb-2">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
						Профиль
					</h2>
					<CloseButton onClick={onClose} label="Закрыть настройку аватара" size="md" />
				</div>

				<div className="flex items-center gap-3">
					<span className="relative block h-20 w-20 shrink-0 border-2 border-[#79502b] bg-[#0f0a05]">
						<Image
							src={avatarSrc(avatar)}
							alt="Предпросмотр аватара"
							width={80}
							height={80}
							unoptimized
							className="h-full w-full [image-rendering:pixelated]"
						/>
						{previewFrame ? (
							<Image
								src={previewFrame}
								alt=""
								width={80}
								height={80}
								unoptimized
								aria-hidden="true"
								className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
							/>
						) : null}
					</span>
					<div className="min-w-0">
						<p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#8a7340]">Внешний вид</p>
						<p className="mt-1 truncate text-base font-black uppercase tracking-[0.08em] text-amber-200">
							{user.login}
						</p>
						<p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#5c3a1a]">
							Аватар и рамка: заглушки
						</p>
					</div>
				</div>

				<p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#8a7340]">Аватар</p>
				<div className="mt-1.5 grid grid-cols-4 gap-2">
					{AVATAR_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => setAvatar(option.id)}
							aria-pressed={avatar === option.id}
							aria-label={`Аватар: ${option.label}`}
							className={`flex flex-col items-center gap-1 border-2 p-1 transition-colors ${
								avatar === option.id
									? 'border-amber-400 bg-[#3a2a12]'
									: 'border-[#5c3a1a] bg-[#21150c] hover:border-[#a67c36]'
							}`}
						>
							<Image
								src={option.src}
								alt=""
								width={48}
								height={48}
								unoptimized
								className="h-12 w-12 [image-rendering:pixelated]"
							/>
							<span className="text-[7px] font-black uppercase tracking-[0.1em] text-[#c9ad74]">
								{option.label}
							</span>
						</button>
					))}
				</div>

				<p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#8a7340]">Рамка</p>
				<div className="mt-1.5 grid grid-cols-4 gap-2">
					{FRAME_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => setFrame(option.id)}
							aria-pressed={frame === option.id}
							aria-label={`Рамка: ${option.label}`}
							className={`flex flex-col items-center gap-1 border-2 p-1 transition-colors ${
								frame === option.id
									? 'border-amber-400 bg-[#3a2a12]'
									: 'border-[#5c3a1a] bg-[#21150c] hover:border-[#a67c36]'
							}`}
						>
							<span className="relative block h-12 w-12">
								<Image
									src={avatarSrc(avatar)}
									alt=""
									width={48}
									height={48}
									unoptimized
									className="h-full w-full [image-rendering:pixelated]"
								/>
								{option.src ? (
									<Image
										src={option.src}
										alt=""
										width={48}
										height={48}
										unoptimized
										aria-hidden="true"
										className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
									/>
								) : null}
							</span>
							<span className="text-[7px] font-black uppercase tracking-[0.1em] text-[#c9ad74]">
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
