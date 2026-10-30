'use client'

import { useState } from 'react'

import type { PlayerProfile } from '@/features/account/types'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import MenuButton from './MenuButton'

type Props = {
	user: PlayerProfile | null
	onBack: () => void
}

const GROUP_SLOTS = 4

const CHIP =
	'border border-[#5c3a1a] bg-[#0f0a05]/70 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]'

const SMALL_BUTTON =
	'border-2 border-[#79502b] bg-[#21150c] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const FIELD =
	'w-full min-w-0 border-2 border-[#5c3a1a] bg-[#0f0a05] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-100 placeholder:text-[#5c3a1a] focus:border-amber-500 focus:outline-none'

// Код группы пока только визуальный: заявка в бой появится вместе
// с сетевым кооперативом, а по логину игрока можно позвать друга.
function groupCode(user: PlayerProfile | null) {
	const tail = (user?.id ?? '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()
	return `PRG-${tail || '0000'}`
}

// Панель группы: слоты напарников, приглашение по логину и кнопка боя.
export default function CoopPanel({ user, onBack }: Props) {
	const [invite, setInvite] = useState('')
	const [ready, setReady] = useState(true)
	const [notice, setNotice] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)

	const code = groupCode(user)
	const members = Array.from({ length: GROUP_SLOTS }, (_, index) =>
		index === 0 ? { login: user?.login ?? 'Игрок', leader: true } : null,
	)

	const invitePlayer = () => {
		const login = invite.trim()
		if (!login) {
			setNotice('Введите логин игрока, которого зовёте в группу')
			return
		}

		setNotice(`Приглашение для «${login}» отправим, как только включим кооператив`)
		setInvite('')
	}

	const copyCode = async () => {
		try {
			await navigator.clipboard.writeText(code)
			setCopied(true)
			setNotice(`Код группы ${code} скопирован`)
		} catch {
			setCopied(false)
			setNotice(`Код группы: ${code}`)
		}
	}

	return (
		<div className="space-y-2">
			<div className="border-2 border-[#3a2a1a] bg-[#0f0a05]/70 p-2.5">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
						Группа
					</span>
					<span className="flex items-center gap-1.5">
						<span className={CHIP}>Код {code}</span>
						<button
							type="button"
							onClick={() => void copyCode()}
							className={SMALL_BUTTON}
						>
							{copied ? 'Скопировано' : 'Копировать'}
						</button>
					</span>
				</div>

				<div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
					{Array.from({ length: GROUP_SLOTS }, (_, index) => {
						const member = members[index]

						return (
							<span
								key={index}
								className={`border-2 px-2 py-2 text-center ${
									member
										? 'border-[#6b8e32]/70 bg-[#141d0a]/80'
										: 'border-dashed border-[#5c3a1a] bg-[#0f0a05]/60'
								}`}
							>
								{member ? (
									<PlayerAvatar
										avatar={user?.avatar}
										frame={user?.avatarFrame}
										size={36}
										alt=""
										className="mx-auto"
									/>
								) : (
									<span className="mx-auto block h-[52px] leading-[52px] text-[16px] text-[#5c3a1a]">+</span>
								)}
								<span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.1em] text-amber-200">
									{member ? member.login : 'Пусто'}
								</span>
								<span
									className={`mt-0.5 block text-[7px] font-black uppercase tracking-[0.14em] ${
										member ? 'text-lime-300' : 'text-[#5c3a1a]'
									}`}
								>
									{member ? (member.leader ? 'ведущий' : 'напарник') : 'слот'}
								</span>
							</span>
						)
					})}
				</div>

				<button
					type="button"
					onClick={() => setReady((current) => !current)}
					className={`mt-2 w-full border-2 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
						ready
							? 'border-[#6b8e32] bg-[#1d2f0f] text-lime-200 hover:border-lime-400'
							: 'border-[#79502b] bg-[#21150c] text-amber-200 hover:border-amber-400'
					}`}
				>
					{ready ? 'Готов к бою' : 'Не готов'}
				</button>
			</div>

			<div className="border-2 border-[#3a2a1a] bg-[#0f0a05]/70 p-2.5">
				<span className="block text-[8px] font-black uppercase tracking-[0.16em] text-[#8a7340]">
					Пригласить по логину
				</span>
				<div className="mt-1.5 flex gap-1.5">
					<input
						value={invite}
						onChange={(event) => {
							setInvite(event.target.value)
							setNotice(null)
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') invitePlayer()
						}}
						placeholder="логин игрока"
						aria-label="Логин игрока"
						maxLength={24}
						className={FIELD}
					/>
					<button type="button" onClick={invitePlayer} className={`${SMALL_BUTTON} shrink-0`}>
						Позвать
					</button>
				</div>

				<div className="mt-1.5 flex gap-1.5">
					<button
						type="button"
						onClick={() => setNotice('Поиск напарников включим вместе с кооперативом')}
						className={`${SMALL_BUTTON} flex-1`}
					>
						Искать напарника
					</button>
					<button
						type="button"
						onClick={() => setNotice('Ссылку на группу скинем другу, когда она заработает')}
						className={`${SMALL_BUTTON} flex-1`}
					>
						Ссылка-приглашение
					</button>
				</div>

				{notice ? (
					<p className="mt-1.5 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-amber-200">
						{notice}
					</p>
				) : null}
			</div>

			<MenuButton disabled badge={ready ? 'нужен напарник' : 'вы не готовы'} variant="primary">
				В бой вдвоём
			</MenuButton>
			<MenuButton onClick={onBack}>Назад</MenuButton>
		</div>
	)
}
