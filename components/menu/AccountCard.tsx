'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { PlayerProfile } from '@/features/account/types'
import { avatarSrc, frameSrc } from '@/lib/account/avatar-options'
import AvatarDialog from './AvatarDialog'

type Props = {
	user: PlayerProfile
	token: string | null
	onUpdated?: (user: PlayerProfile) => void
}

// Мини-профиль над меню: аватар с рамкой, логин, рейтинг и число игр.
// Клик по аватару открывает выбор внешнего вида.
export default function AccountCard({ user, token, onUpdated }: Props) {
	const [editing, setEditing] = useState(false)
	const frame = frameSrc(user.avatarFrame)
	const isAdmin = user.role === 'admin'

	return (
		<>
			<div className="mb-3 flex items-center gap-3 border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 px-3 py-2.5 shadow-[0_0_20px_rgba(0,0,0,0.7)]">
				<button
					type="button"
					onClick={() => setEditing(true)}
					aria-label="Сменить аватар"
					title="Сменить аватар"
					className="relative block h-14 w-14 shrink-0 border-2 border-[#79502b] bg-[#0f0a05] shadow-[inset_0_0_0_2px_#21150c] transition-colors hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<Image
						src={avatarSrc(user.avatar)}
						alt="Аватар игрока"
						width={56}
						height={56}
						unoptimized
						className="h-full w-full [image-rendering:pixelated]"
					/>
					{frame ? (
						<Image
							src={frame}
							alt=""
							width={56}
							height={56}
							unoptimized
							aria-hidden="true"
							className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
						/>
					) : null}
				</button>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
							{user.login}
						</span>
						{isAdmin ? (
							<span className="shrink-0 border border-amber-500/70 bg-amber-900/40 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.14em] text-amber-200">
								Админ
							</span>
						) : null}
					</div>

					<div className="mt-1 flex gap-3 text-[8px] font-bold uppercase tracking-[0.1em] text-[#8a7340]">
						<span>
							Рейтинг <span className="tabular-nums text-yellow-300">{user.record ?? 0}</span>
						</span>
						<span>
							Игр <span className="tabular-nums text-amber-200">{user.gamesPlayed ?? 0}</span>
						</span>
					</div>
				</div>

				<button
					type="button"
					onClick={() => setEditing(true)}
					disabled={!token}
					className="shrink-0 border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
				>
					Аватар
				</button>
			</div>

			{editing ? (
				<AvatarDialog
					user={user}
					token={token}
					onClose={() => setEditing(false)}
					onSaved={(updated) => onUpdated?.(updated)}
				/>
			) : null}
		</>
	)
}
