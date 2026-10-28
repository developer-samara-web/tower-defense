import Image from 'next/image'
import type { ReactNode } from 'react'

import type { PlayerProfile } from '@/features/account/types'

type Props = {
	title: string
	user: PlayerProfile | null
	children: ReactNode
}

// Общая рамка экранов меню: фон, логотип, заголовок и список кнопок.
export default function MenuShell({ title, user, children }: Props) {
	return (
		<main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[url(/game/background.png)] bg-cover bg-center px-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="absolute inset-0 bg-gradient-to-b from-[#05080a]/70 via-[#0a0e12]/40 to-[#05080a]/85" />

			<div className="relative w-full max-w-md rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] sm:p-7">
				<div className="relative">
					{user ? (
						<div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-1">
							<span className="h-2 w-2 bg-lime-400 shadow-[0_0_5px_#a3e635]" />
							<span className="max-w-[110px] truncate text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
								{user.login}
							</span>
						</div>
					) : null}

					<Image
						src="/game/logo.png"
						alt="Legends of Prigranica"
						width={120}
						height={60}
						priority
						className="mx-auto drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]"
					/>
				</div>

				<h1 className="mt-5 text-center text-xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e]">
					{title}
				</h1>

				<div className="mt-5 space-y-2">{children}</div>
			</div>
		</main>
	)
}
