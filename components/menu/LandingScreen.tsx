import Image from 'next/image'

type LandingScreenProps = {
	onStart: () => void
}

export default function LandingScreen({ onStart }: LandingScreenProps) {
	return (
		<main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[url(/game/background.png)] bg-cover bg-center px-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="absolute inset-0 bg-gradient-to-b from-[#05080a]/70 via-[#0a0e12]/35 to-[#05080a]/85" />

			<div className="relative flex w-full max-w-lg flex-col items-center text-center">
				<Image
					src="/game/logo.png"
					alt="Legends of Prigranica"
					width={330}
					height={180}
					priority
					className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]"
				/>

				<h1 className="mt-2 text-3xl font-black uppercase tracking-[0.16em] text-amber-300 drop-shadow-[0_4px_0_#5c2d0e] sm:text-4xl">
					Врата Замка
				</h1>

				<p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#b5a17b]">
					Легенды Приграничья
				</p>

				<p className="mt-4 max-w-sm text-xs font-bold leading-relaxed text-[#c9b491]">
					Построй башни, удерживай волны врагов и защити замок.
				</p>

				<button
					type="button"
					onClick={onStart}
					className="mt-8 w-full max-w-xs rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] py-5 text-xl font-black uppercase tracking-[0.25em] text-[#f5e6c8] shadow-[0_5px_0_#3a1d0a,0_0_24px_rgba(250,204,21,0.18)] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[3px] active:shadow-[0_2px_0_#3a1d0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					Начать
				</button>

				<p className="mt-5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#8a7340]">
					Одиночная игра · Профиль · Топ игроков
				</p>
			</div>
		</main>
	)
}
