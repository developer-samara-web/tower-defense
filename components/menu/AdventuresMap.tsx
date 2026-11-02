import type { AdventureBoard, AdventureNode } from '@/lib/compendium/adventure-rules'

type Props = {
	board: AdventureBoard | null
	loading: boolean
	error: string
	onBack: () => void
	onPlay: (mapId: string) => void
	onRetry: () => void
}

const BOX = { width: 100, height: 60 }
// Тропа рисуется в тех же координатах, что и узлы: один источник правды
// для линий разметки и для кнопок, иначе метки разойдутся на другом размере.
const ROUTE: Array<[number, number]> = [
	[7, 51],
	[17, 33],
	[27, 47],
	[37, 27],
	[33, 10],
	[49, 9],
	[58, 27],
	[67, 45],
	[79, 31],
	[91, 13],
]

const PERGAMENT =
	'radial-gradient(circle at 22% 28%, rgba(122,74,28,0.18), transparent 42%),' +
	'radial-gradient(circle at 78% 64%, rgba(90,58,20,0.22), transparent 46%),' +
	'radial-gradient(circle at 46% 92%, rgba(60,38,12,0.26), transparent 55%),' +
	'linear-gradient(135deg, #e9d6a4 0%, #dcc085 45%, #c8a666 100%)'

const NODE =
	'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 px-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5c2d0e]'

// Пунктир идёт через середины отрезков: линия изгибается там, где её
// рисовали рукой, но не уводит метку с отмеченной точки.
function dashedTrail(points: Array<[number, number]>): string {
	const [start, ...rest] = points
	if (!start) return ''
	if (rest.length === 1) return `M ${start[0]} ${start[1]} L ${rest[0][0]} ${rest[0][1]}`

	let path = `M ${start[0]} ${start[1]}`
	for (let index = 0; index < rest.length - 1; index += 1) {
		const [x, y] = rest[index]
		const [nextX, nextY] = rest[index + 1]
		path += ` Q ${x} ${y} ${(x + nextX) / 2} ${(y + nextY) / 2}`
	}

	const [lastX, lastY] = rest[rest.length - 1]
	return `${path} L ${lastX} ${lastY}`
}

export default function AdventuresMap({ board, loading, error, onBack, onPlay, onRetry }: Props) {
	return (
		<main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[url(/ui/background.png)] bg-cover bg-center font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="absolute inset-0 bg-gradient-to-b from-[#05080a]/80 via-[#0a0e12]/55 to-[#05080a]/90" />

			<div className="relative flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
				<header className="flex flex-wrap items-center justify-between gap-2">
					<button
						type="button"
						onClick={onBack}
						className="inline-flex items-center gap-2 border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
					>
						<span className="text-[13px] leading-none">←</span>
						Меню
					</button>

					<div className="flex items-baseline gap-3">
						<h1 className="text-lg font-black uppercase tracking-[0.2em] text-indigo-300 drop-shadow-[0_2px_0_#1a1440]">
							Приключения
						</h1>
						<p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
							{board ? `пройдено ${board.passed} из ${board.total}` : 'тропа в океане'}
						</p>
					</div>
				</header>

				<div className="relative min-h-0 flex-1 overflow-y-auto">
					{loading ? (
						<p className="pt-10 text-center text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
							Карта загружается…
						</p>
					) : null}

					{error ? (
						<div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 border-2 border-[#7f2d24] bg-[#21150c] px-4 py-4 text-center">
							<p className="text-[11px] font-black uppercase tracking-[0.14em] text-red-300">{error}</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={onRetry}
									className="border-2 border-[#79502b] bg-[#2a1d0a] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									Повторить
								</button>
								<button
									type="button"
									onClick={onBack}
									className="border-2 border-[#79502b] bg-[#2a1d0a] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									В меню
								</button>
							</div>
						</div>
					) : null}

					{board ? <Board board={board} onPlay={onPlay} /> : null}
				</div>
			</div>
		</main>
	)
}

function Board({ board, onPlay }: { board: AdventureBoard; onPlay: (mapId: string) => void }) {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
			<p className="text-[9px] font-bold leading-snug tracking-[0.06em] text-amber-200/80">
				Десять рейтинговых карт лежат на одной тропе. Идти можно на любую, но приз
				даётся за ту, где замок продержался {board.passWave} волн.
			</p>

			<div
				className="relative w-full border-4 border-[#5c3a1a] shadow-[inset_0_0_60px_rgba(90,58,20,0.55),0_10px_24px_rgba(0,0,0,0.7)]"
				style={{ aspectRatio: `${BOX.width} / ${BOX.height}`, background: PERGAMENT }}
			>
				<svg
					viewBox={`0 0 ${BOX.width} ${BOX.height}`}
					preserveAspectRatio="none"
					className="absolute inset-0 h-full w-full"
					aria-hidden
				>
					<path
						d={dashedTrail(ROUTE)}
						fill="none"
						stroke="#6b4a1f"
						strokeWidth={3}
						strokeLinecap="round"
						strokeDasharray="7 6"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				<Compass />

				{board.nodes.map((node, index) => (
					<MapMark
						key={node.catalogId}
						node={node}
						place={ROUTE[index] ?? [50, 30]}
						box={BOX}
						onPlay={onPlay}
					/>
				))}

				<span className="absolute -translate-x-1/2 -translate-y-1/2 text-[22px] leading-none text-[#7f2d24]" style={{ left: '94%', top: '82%' }}>
					✕
				</span>
			</div>

			<Prizes board={board} />
		</div>
	)
}

function MapMark({
	node,
	place,
	box,
	onPlay,
}: {
	node: AdventureNode
	place: [number, number]
	box: { width: number; height: number }
	onPlay: (mapId: string) => void
}) {
	const open = Boolean(node.mapId)
	const circle = node.passed
		? 'border-lime-300 bg-[#3f6b2f] text-lime-50 shadow-[0_2px_0_#243d18]'
		: open
			? 'border-[#5c2d0e] bg-[#a4692a] text-[#2a1d0a] shadow-[0_2px_0_#5c3a1a]'
			: 'border-[#6b5a3e] bg-[#8a7340]/60 text-[#3a2a12]'

	return (
		<button
			type="button"
			disabled={!open}
			onClick={() => node.mapId && onPlay(node.mapId)}
			title={node.idea}
			className={`${NODE} ${open ? 'cursor-pointer' : 'cursor-not-allowed'}`}
			style={{ left: `${(place[0] / box.width) * 100}%`, top: `${(place[1] / box.height) * 100}%` }}
		>
			<span className={`flex h-8 w-8 items-center justify-center border-2 text-[12px] font-black leading-none ${circle}`}>
				{node.passed ? '✓' : node.order}
			</span>
			<span className="text-[8px] font-black uppercase leading-tight tracking-[0.06em] text-[#3a2a12]">
				{node.name}
			</span>
			<span className="text-[7px] font-bold uppercase leading-none tracking-[0.06em] text-[#5c3a1a]">
				{node.stars.toFixed(1)}★ · {node.plays > 0 ? `волна ${node.bestWave}` : 'нет забегов'}
			</span>
		</button>
	)
}

function Compass() {
	return (
		<svg viewBox="0 0 64 64" className="absolute bottom-3 right-3 h-14 w-14 opacity-80" aria-hidden>
			<circle cx="32" cy="32" r="27" fill="none" stroke="#6b4a1f" strokeWidth="2" />
			<circle cx="32" cy="32" r="20" fill="none" stroke="#6b4a1f" strokeWidth="1" strokeDasharray="3 3" />
			<path d="M32 8 L36 29 L57 32 L36 35 L32 56 L28 35 L7 32 L28 29 Z" fill="#a4692a" stroke="#4a2f12" strokeWidth="1.2" />
			<g fill="#3a2a12" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="monospace">
				<text x="32" y="7">С</text>
				<text x="61" y="35">В</text>
				<text x="32" y="63">Ю</text>
				<text x="4" y="35">З</text>
			</g>
		</svg>
	)
}

function Prizes({ board }: { board: AdventureBoard }) {
	const grand = board.prizes.find((prize) => prize.grand) ?? null
	const mapPrizes = board.prizes.filter((prize) => !prize.grand)

	return (
		<section className="flex flex-col gap-2">
			<h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
				Призы за тропу
			</h2>

			{/* Награды пока заглушки: содержимое слотов придумывают отдельно. */}
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
				{mapPrizes.map((prize) => (
					<PrizeCell key={prize.slot} prize={prize} />
				))}
			</div>

			{grand ? <PrizeCell prize={grand} wide /> : null}
		</section>
	)
}

function PrizeCell({
	prize,
	wide,
}: {
	prize: AdventureBoard['prizes'][number]
	wide?: boolean
}) {
	const frame = prize.unlocked
		? 'border-amber-400 bg-gradient-to-b from-[#5b3fa8] to-[#2a2f74] text-indigo-50'
		: 'border-[#3a2a1a] bg-[#161009] text-[#6b5a3e]'

	return (
		<div
			className={`flex items-center gap-2 border-2 px-2 py-2 ${wide ? 'justify-center text-center' : ''} ${frame}`}
		>
			<span className="flex h-7 w-7 shrink-0 items-center justify-center border border-current text-[11px] font-black leading-none">
				{prize.grand ? '★' : prize.slot}
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-[9px] font-black uppercase tracking-[0.12em]">{prize.title}</span>
				<span className="truncate text-[8px] font-bold tracking-[0.06em] opacity-80">
					{prize.unlocked ? prize.note : 'ещё не открыт'}
				</span>
			</span>
		</div>
	)
}
