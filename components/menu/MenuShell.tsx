import Image from 'next/image'
import type { ReactNode } from 'react'

import type { PlayerProfile } from '@/features/account/types'
import AccountCard from './AccountCard'

type Props = {
	title: string
	user: PlayerProfile | null
	children: ReactNode
	wide?: boolean
}

// Общая рамка экранов меню: фон, мини-профиль, логотип,
// заголовок и список кнопок.
export default function MenuShell({
	title,
	user,
	children,
	wide,
}: Props) {
	return (
		<main className="relative h-[100dvh] w-full overflow-y-auto bg-[url(/game/background.png)] bg-cover bg-center font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="fixed inset-0 bg-gradient-to-b from-[#05080a]/70 via-[#0a0e12]/40 to-[#05080a]/85" />

			<div className="relative flex min-h-full items-center justify-center px-4 py-4">
				<div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
					{user ? <AccountCard user={user} /> : null}

					<div className="relative rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] sm:p-7">
						<Image
							src="/game/logo.png"
							alt="Legends of Prigranica"
							width={120}
							height={60}
							priority
							className="mx-auto drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]"
						/>

						<h1 className="mt-5 text-center text-xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e]">
							{title}
						</h1>

						<div className="mt-5 space-y-2">{children}</div>
					</div>
				</div>
			</div>
		</main>
	)
}
