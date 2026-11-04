import Image from 'next/image'
import Link from 'next/link'

import LandingPlayButton from '@/components/landing/LandingPlayButton'
import {
	UPDATES,
	UPDATE_KIND_LABEL,
	formatUpdateDate,
	type UpdateKind,
} from '@/lib/updates'

const PANEL =
	'border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(74,55,35,0.18)]'
const HEADING = 'font-black uppercase tracking-[0.14em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]'

const KIND_STYLE: Record<UpdateKind, string> = {
	new: 'border-lime-500/60 bg-lime-500/10 text-lime-300',
	fix: 'border-sky-500/60 bg-sky-500/10 text-sky-300',
	balance: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
	ui: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-200',
}

// Страница обновлений: та же тёмная рамка и янтарные акценты, что у
// лендинга, но вместо секций — вертикальная лента версий.
export default function UpdatesPage() {
	return (
		<main className="relative w-full overflow-x-clip bg-[url(/ui/background.png)] bg-cover bg-center bg-fixed font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="fixed inset-0 z-0 bg-gradient-to-b from-[#05080a]/88 via-[#0a0e12]/82 to-[#05080a]/92" />

			<header className="sticky top-0 z-50 border-b border-[#3a2a1a]/80 bg-[#05080a]/85 backdrop-blur-md">
				<div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4">
					<Link
						href="/"
						className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
					>
						<Image src="/ui/logo.png" alt="" width={44} height={24} className="h-6 w-11 object-contain" />
						<span className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
							TowerForce
						</span>
					</Link>

					<div className="flex shrink-0 items-center gap-2">
						<Link
							href="/"
							className="hidden border-2 border-[#79502b] bg-[#21150c] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:inline-flex"
						>
							На главную
						</Link>
						<LandingPlayButton className="border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400">
							Играть
						</LandingPlayButton>
					</div>
				</div>
			</header>

			<div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
				<div className="max-w-2xl">
					<span className="text-[10px] font-black uppercase tracking-[0.34em] text-[#8a7340]">
						Журнал изменений
					</span>
					<h1 className={`mt-2 text-3xl sm:text-4xl ${HEADING}`}>Обновления TowerForce</h1>
					<p className="mt-3 text-[13px] font-bold leading-relaxed text-[#b5a17b] sm:text-sm">
						Что появилось в игре, что починили и что поменяли в балансе. Новые версии
						сверху: от первого замка до текущего релиза.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<span className="inline-flex items-center gap-1.5 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#c9b491]">
							{UPDATES.length} версий
						</span>
						<span className="inline-flex items-center gap-1.5 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#c9b491]">
							с 22 октября 2026
						</span>
					</div>
				</div>

				<ol className="mt-10 space-y-4 border-l border-[#3a2a1a] pl-5 sm:pl-7">
					{UPDATES.map((release, index) => (
						<li key={release.version} className="relative">
							<span
								aria-hidden="true"
								className={`absolute -left-[27px] top-6 h-3 w-3 rotate-45 border-2 sm:-left-[35px] ${
									index === 0
										? 'border-amber-300 bg-amber-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
										: 'border-[#6b4c1f] bg-[#0f0a05]'
								}`}
							/>

							<article className={`${PANEL} p-5`}>
								<header className="flex flex-wrap items-center gap-x-3 gap-y-2">
									<span className="border-2 border-[#6b4c1f] bg-[#2a1d0a] px-2 py-0.5 text-[11px] font-black tracking-[0.08em] text-amber-300">
										v{release.version}
									</span>
									{index === 0 ? (
										<span className="border border-lime-500/60 bg-lime-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-lime-300">
											последняя
										</span>
									) : null}
									<time
										dateTime={release.date}
										className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a7340]"
									>
										{formatUpdateDate(release.date)}
									</time>
								</header>

								<h2 className="mt-2 text-[15px] font-black uppercase tracking-[0.1em] text-amber-200">
									{release.title}
								</h2>
								<p className="mt-1.5 text-[11px] font-bold leading-relaxed text-[#b5a17b]">
									{release.summary}
								</p>

								<ul className="mt-3 space-y-1.5">
									{release.changes.map((change) => (
										<li key={change.text} className="flex items-start gap-2">
											<span
												className={`mt-px shrink-0 border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${KIND_STYLE[change.kind]}`}
											>
												{UPDATE_KIND_LABEL[change.kind]}
											</span>
											<span className="text-[10px] font-bold leading-snug text-[#c9b491]">
												{change.text}
											</span>
										</li>
									))}
								</ul>
							</article>
						</li>
					))}
				</ol>

				<footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[#3a2a1a]/80 pt-4 text-[9px] font-black uppercase tracking-[0.18em] text-[#8a7340] sm:flex-row">
					<span>© TowerForce</span>
					<span className="flex items-center gap-3">
						<Link href="/" className="transition-colors hover:text-amber-300">
							На главную
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
