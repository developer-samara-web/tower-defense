'use client'

import { useEffect, useState } from 'react'
import GameCanvas from '@/components/game/GameCanvas'
import TowerDetails from '@/components/game/TowerDetails'
import { TOWER_TYPES, type TowerType } from '@/features/game/config/game.config'
import { generateUpgradeCards, type UpgradeCard } from '@/features/game/domain/upgrade-cards'
import { initialResources } from '@/features/game/domain/game-rules'
import Image from 'next/image'

type SelectedTowerInfo = {
	id: string
	type: TowerType
	name: string
	level: number
	maxLevel: number
	damage: number
	range: number
	attackSpeed: number
	upgradeCost: number | null
}

type GameState = {
	wave: number
	gold: number
	lives: number
	enemies: number
	selectedTower: TowerType
	selectedBuiltTower: SelectedTowerInfo | null
	status: string
	waveActive: boolean
	nextWaveIn: number
	gameOver: boolean
}

type Score = { id: string; login?: string; wave: number; gold: number; createdAt: string }

const SCORE_STORAGE_KEY = 'tower-defense:scores'
const MAX_SCORES = 8

const initialState: GameState = {
	wave: 0,
	gold: initialResources.gold,
	lives: initialResources.lives,
	enemies: 0,
	selectedTower: 'fire',
	selectedBuiltTower: null,
	status: 'Выбери башню и подготовь оборону',
	waveActive: false,
	nextWaveIn: 0,
	gameOver: false,
}

const towers = (
	Object.entries(TOWER_TYPES) as [TowerType, (typeof TOWER_TYPES)[TowerType]][]
).map(([id, tower], index) => ({
	id,
	name: tower.name,
	cost: tower.cost,
	key: String(index + 1),
	color: `#${tower.color.toString(16).padStart(6, '0')}`,
	damage: tower.damage,
	range: tower.range,
	attackSpeed: tower.attackSpeed,
	dps: Math.round(tower.damage / (tower.attackSpeed / 1000)),
	image: tower.image,
}))

function readScores(): Score[] {
	try {
		const stored = localStorage.getItem(SCORE_STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored) as Score[]
			return Array.isArray(parsed) ? parsed.slice(0, MAX_SCORES) : []
		}
	} catch { return [] }
	return []
}

function saveScore(detail: Pick<Score, 'wave' | 'gold'>): Score[] {
	const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
	if (token) {
		fetch('/api/scores/update', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
			body: JSON.stringify({ gold: detail.gold }),
		}).catch(() => {})
	}
	const next = [
		{ id: crypto.randomUUID(), wave: detail.wave, gold: detail.gold, createdAt: new Date().toISOString() },
		...readScores(),
	].sort((a, b) => b.wave - a.wave || b.gold - a.gold).slice(0, MAX_SCORES)
	try { localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(next)) } catch {}
	return next
}

export default function HomePage() {
	const [game, setGame] = useState<GameState>(initialState)
	const [scores, setScores] = useState<Score[]>([])
	const [showLeaderboard, setShowLeaderboard] = useState(false)
	const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([])
	const [cardsShown, setCardsShown] = useState(false)

	const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
	const [authLogin, setAuthLogin] = useState('')
	const [authEmail, setAuthEmail] = useState('')
	const [authPassword, setAuthPassword] = useState('')
	const [authLoading, setAuthLoading] = useState(false)
	const [authError, setAuthError] = useState('')
	const [authChecked, setAuthChecked] = useState(false)

	useEffect(() => {
		const handleState = (event: Event) =>
			setGame((prev) => ({ ...prev, ...(event as CustomEvent<Partial<GameState>>).detail }))
		const handleGameOver = (event: Event) => {
			const detail = (event as CustomEvent<Pick<Score, 'wave' | 'gold'>>).detail
			if (detail && Number.isFinite(detail.wave) && Number.isFinite(detail.gold)) {
				setScores(saveScore(detail))
			}
		}
		window.addEventListener('td:state', handleState)
		window.addEventListener('td:game-over', handleGameOver)
		return () => {
			window.removeEventListener('td:state', handleState)
			window.removeEventListener('td:game-over', handleGameOver)
		}
	}, [])

	useEffect(() => {
		fetch('/api/scores/top').then((r) => r.json()).then((d) => d.scores && setScores(d.scores)).catch(() => setScores(readScores()))
	}, [])

	useEffect(() => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
		if (token) {
			fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
				.then((r) => r.json())
				.then((d) => { if (d.user) setGame((prev) => ({ ...prev, gold: d.user.record || 0 })) })
				.catch(() => {})
				.finally(() => setAuthChecked(true))
		} else {
			queueMicrotask(() => setAuthChecked(true))
		}
	}, [])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		const isUpgradeWave = game.wave > 0 && game.wave % 5 === 0
		if (isUpgradeWave && !cardsShown) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setUpgradeCards(generateUpgradeCards(3))
			setCardsShown(true)
		}
		if (!isUpgradeWave && cardsShown) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setUpgradeCards([])
			setCardsShown(false)
		}
	}, [game.wave, cardsShown])

	const selectTower = (towerId: TowerType) => window.dispatchEvent(new CustomEvent('td:select-tower', { detail: { towerId } }))
	const startWave = () => window.dispatchEvent(new CustomEvent('td:start-wave'))
	const upgradeTower = () => window.dispatchEvent(new CustomEvent('td:upgrade-tower'))
	const deselectTower = () => window.dispatchEvent(new CustomEvent('td:deselect-tower'))
	const pickUpgrade = (card: UpgradeCard) => {
		window.dispatchEvent(new CustomEvent('td:pick-upgrade', { detail: { card } }))
		setUpgradeCards([])
		setCardsShown(true)
	}
	const restartGame = () => {
		setGame(initialState)
		window.dispatchEvent(new CustomEvent('td:restart'))
	}

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault()
		setAuthError('')
		setAuthLoading(true)
		const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
		const body = authMode === 'login'
			? JSON.stringify({ login: authLogin, password: authPassword })
			: JSON.stringify({ login: authLogin, email: authEmail, password: authPassword })
		try {
			const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
			const data = await res.json()
			if (!res.ok) setAuthError(data.error || 'Ошибка')
			else if (data.token) { localStorage.setItem('td_token', data.token); window.location.reload() }
			else { setAuthMode('login'); setAuthError('') }
		} catch { setAuthError('Ошибка сети') } finally { setAuthLoading(false) }
	}

	const waveButtonDisabled = !game.gameOver && (game.waveActive || game.wave > 0)
	const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null

	return (
		!authChecked ? (
			<main className="h-dvh w-full overflow-hidden bg-gradient-to-b from-[#0a0e12] via-[#141820] to-[#0a0e12] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 flex items-center justify-center px-4 bg-[url(/game/background.png)] bg-cover">
				<div className="w-full max-w-sm rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] p-6 sm:p-8">
					<div className="mb-6 flex flex-col items-center gap-3">
						<Image src="/game/logo.png" alt="Legends of Prigranica" width={220} height={110} priority className="drop-shadow-[0_4px_8px_rgba(212,160,60,0.25)]" />
					</div>
					<h1 className="text-center text-2xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e] mb-6">Врата Замка</h1>
					<form onSubmit={handleAuth} className="space-y-4">
						<div className="flex rounded-none border-2 border-[#3a2a1a] overflow-hidden bg-[#0f0a05]/30">
							<button type="button" className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${authMode === 'login' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'}`} onClick={() => setAuthMode('login')}>Вход</button>
							<button type="button" className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${authMode === 'register' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'}`} onClick={() => setAuthMode('register')}>Регистрация</button>
						</div>
						<input type="text" placeholder="Логин" value={authLogin} onChange={(e) => setAuthLogin(e.target.value)} className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600" />
						{authMode === 'register' && <input type="email" placeholder="Почта" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600" />}
						<input type="password" placeholder="Пароль" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600" />
						{authError && <p className="text-xs font-black text-red-400 tracking-wide">{authError}</p>}
						<button type="submit" disabled={authLoading} className="w-full rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] py-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5e6c8] shadow-[0_4px_0_#3a1d0a] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[2px] active:shadow-[0_2px_0_#3a1d0a] disabled:opacity-40">{authLoading ? 'Загрузка...' : authMode === 'login' ? 'Войти в Замок' : 'Создать Героя'}</button>
					</form>
				</div>
			</main>
		) : !token ? (
			<main className="h-dvh w-full overflow-hidden bg-gradient-to-b from-[#0a0e12] via-[#141820] to-[#0a0e12] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 flex items-center justify-center px-4 bg-[url(/game/background.png)] bg-cover">
				<div className="w-full max-w-md rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] p-6 sm:p-8">
					<div className="mb-6 flex flex-col items-center gap-3">
						<Image src="/game/logo.png" alt="Legends of Prigranica" width={220} height={110} priority className="drop-shadow-[0_4px_8px_rgba(212,160,60,0.25)]" />
					</div>
					<h1 className="text-center text-2xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e] mb-6">Врата Замка</h1>
					<form onSubmit={handleAuth} className="space-y-4">
						<div className="flex rounded-none border-2 border-[#3a2a1a] overflow-hidden bg-[#0f0a05]/30">
							<button type="button" className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${authMode === 'login' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'}`} onClick={() => setAuthMode('login')}>Вход</button>
							<button type="button" className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${authMode === 'register' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'}`} onClick={() => setAuthMode('register')}>Регистрация</button>
						</div>
						<input type="text" placeholder="Логин" value={authLogin} onChange={(e) => setAuthLogin(e.target.value)} className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600" />
						{authMode === 'register' && <input type="email" placeholder="Почта" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600" />}
						<input type="password" placeholder="Пароль" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600" />
						{authError && <p className="text-xs font-black text-red-400 tracking-wide">{authError}</p>}
						<button type="submit" disabled={authLoading} className="w-full rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] py-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5e6c8] shadow-[0_4px_0_#3a1d0a] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[2px] active:shadow-[0_2px_0_#3a1d0a] disabled:opacity-40">{authLoading ? 'Загрузка...' : authMode === 'login' ? 'Войти в Замок' : 'Создать Героя'}</button>
					</form>
				</div>
			</main>
		) : (
			<main className="h-dvh w-full overflow-hidden bg-[#3e722b] bg-[url(/game/background.png)] bg-cover bg-center bg-no-repeat text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 relative flex flex-col">
				{/* Logo top-left */}
				<div className="absolute top-3 left-3 z-40 pointer-events-none drop-shadow-lg">
					<Image src="/game/logo.png" alt="Logo" width={120} height={60} className="opacity-90" />
				</div>

				{/* Top-right: leaderboard icon + menu */}
				<div className="absolute top-3 right-3 z-40 flex gap-2">
					<button
						onClick={() => setShowLeaderboard(!showLeaderboard)}
						className="flex h-9 w-9 items-center justify-center rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#3a2515] to-[#1a1008] text-amber-300 shadow-[0_2px_4px_rgba(0,0,0,0.6)] hover:border-amber-600 hover:text-amber-100 transition active:translate-y-[1px]"
						aria-label="Топ игроков"
						title="Топ игроков"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-.01L12 2z" /></svg>
					</button>
				</div>

				{/* Leaderboard mini overlay */}
				{showLeaderboard && (
					<div className="absolute top-12 right-3 z-50 w-56 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_8px_24px_rgba(0,0,0,0.9)] overflow-hidden">
						<div className="flex items-center justify-between border-b border-[#3a2a1a]/60 px-2 py-1.5">
							<span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-300">Топ</span>
							<button onClick={() => setShowLeaderboard(false)} className="text-[10px] font-black text-[#8a7340] hover:text-amber-300">×</button>
						</div>
						<div className="max-h-48 overflow-y-auto px-2 py-1 space-y-0.5">
							{scores.length === 0 ? (
								<p className="text-[9px] text-[#5c3a1a] font-bold px-1 py-3 text-center">Нет рекордов</p>
							) : (
								scores.map((s, i) => (
									<div key={s.id} className="flex items-center gap-2 text-[10px] font-bold">
										<span className="w-4 text-center text-amber-400 font-black">{i + 1}</span>
										<span className="min-w-0 truncate text-amber-100">{s.login || 'Герой'}</span>
										<span className="ml-auto text-amber-300 tabular-nums">{s.wave}в · {s.gold}з</span>
									</div>
								))
							)}
						</div>
					</div>
				)}

				{/* Game area */}
				<section className="relative min-h-0 flex-1 overflow-hidden">
					<GameCanvas />
					<div className="pointer-events-none absolute bottom-3 left-3 z-40 max-w-[calc(100%-1.5rem)] border border-[#3a2a1a]/80 bg-[#0f0a05]/75 px-2 py-1.5 text-[9px] font-bold uppercase leading-relaxed tracking-[0.1em] text-[#a89060] shadow-[0_2px_0_rgba(0,0,0,0.5)]">
						ЛКМ — башня · ПКМ/СКМ — камера · WASD — движение · Колесо — зум
					</div>

					{/* Upgrade cards overlay */}
					{upgradeCards.length > 0 && !game.gameOver ? (
						<div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-3">
							<div className="w-full max-w-2xl border-2 border-[#5c2d0e] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(74,55,35,0.25)] sm:p-5">
								<h3 className="text-center text-sm font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">Волна {game.wave}: выбери улучшение</h3>
								<p className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">Одна из трёх карточек усилит башни до конца игры</p>
								<div className="mt-4 grid gap-2 sm:grid-cols-3">
									{upgradeCards.map((card) => (
										<button key={card.id} onClick={() => pickUpgrade(card)} className="group flex min-h-[120px] flex-col gap-2 border-2 border-[#4a3728] bg-gradient-to-b from-[#2a1d0a] to-[#171109] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:from-[#3a2a12] active:translate-y-0">
											<span className="w-fit border border-[#5c2d0e] bg-[#0f0a05]/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400">{TOWER_TYPES[card.type].name}</span>
											<span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-100">{card.name}</span>
											<span className="mt-auto text-[10px] font-bold text-[#b5a17b]">{card.description}</span>
										</button>
									))}
								</div>
						</div>
					</div>
				) : null}

				{game.selectedBuiltTower ? (
					<div className="absolute top-14 right-3 z-50 max-w-[220px] scale-90 origin-top-right md:scale-100 md:right-4 md:top-14">
						<TowerDetails
							name={game.selectedBuiltTower.name}
							level={game.selectedBuiltTower.level}
							maxLevel={game.selectedBuiltTower.maxLevel}
							damage={game.selectedBuiltTower.damage}
							range={game.selectedBuiltTower.range}
							attackSpeed={game.selectedBuiltTower.attackSpeed}
							upgradeCost={game.selectedBuiltTower.upgradeCost}
							gold={game.gold}
							onUpgrade={upgradeTower}
							onClose={deselectTower}
						/>
					</div>
				) : null}
			</section>

			{/* Status above bar — dark text with strong shadow */}
			<div className="absolute bottom-[92px] left-1/2 -translate-x-1/2 z-30 w-full max-w-[640px] px-2 pointer-events-none">
				<div className="flex justify-center">
					<div className="rounded-none bg-[#0f0a05]/90 border-[3px] border-[#2a1d0a] px-4 py-1 shadow-[4px_4px_0_#1a0f05,0_0_0_#000] backdrop-blur-sm">
						<p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f5e6c8] drop-shadow-[0_2px_4px_rgba(0,0,0,1),0_1px_0_#5c2d0e]">{game.status}</p>
					</div>
				</div>
			</div>

			{/* Bottom compact pixel-art bar */}
			<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-[640px] px-2">
				<div className="flex h-[56px] items-center gap-1.5 rounded-none border-[3px] border-[#5c3a1a] bg-[#0f0a05]/85 px-2 shadow-[4px_4px_0_#2a1d0a,0_0_0_#000]">
				{/* Tower cards mini */}
				<div className="flex gap-1.5 overflow-x-auto">
					{towers.map((tower) => {
						const selected = game.selectedTower === tower.id
						return (
							<button
								key={tower.id}
								type="button"
								onClick={() => selectTower(tower.id)}
								aria-pressed={selected}
								className={`group relative flex h-[48px] w-[68px] shrink-0 flex-col items-center justify-center rounded-none border-[3px] p-1 text-center transition-all duration-75 ${selected ? 'border-amber-300 bg-[#1a0f05] shadow-[3px_3px_0_#5c2d0e]' : 'border-[#2a1d0a] bg-[#0d0802] hover:border-amber-600 hover:bg-[#140c05]'} focus:outline-none`}
							>
								<Image src={tower.image} width={26} height={26} alt={tower.name} className="mb-0.5 drop-shadow-[2px_2px_0_#000]" />
								<span className={`text-[7px] font-black uppercase tracking-[0.08em] leading-none ${selected ? 'text-amber-200' : 'text-amber-100/70'}`}>{tower.name}</span>
								<span className="text-[6px] font-black tabular-nums text-[#b5a17b]/80">{tower.cost}g</span>
							</button>
						)
					})}
				</div>

				{/* Divider */}
				<div className="mx-1 h-10 w-px bg-gradient-to-b from-transparent via-[#4a3728]/50 to-transparent shrink-0" />

				{/* Wave button */}
				<button
					type="button"
					onClick={game.gameOver ? restartGame : startWave}
					disabled={waveButtonDisabled}
					className="h-[48px] shrink-0 rounded-none border-[3px] border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] px-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#f5e6c8] shadow-[3px_3px_0_#3a1d0a] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
				>
					{game.gameOver ? 'ЗАНОВО' : game.waveActive ? 'ВОЛНА' : game.wave === 0 ? 'СТАРТ' : `ВОЛНА ${game.wave + 1}`}
				</button>

				{/* Resources — moved right of wave button */}
				<div className="flex shrink-0 gap-1.5 ml-auto">
					<div className="flex h-[48px] w-[64px] flex-col items-center justify-center rounded-none border-[3px] border-[#4a3728]/80 bg-[#120d05] px-1.5 shadow-[3px_3px_0_#2a1d0a]">
						<span className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8a7340]">◆</span>
						<span className="text-xs font-black text-amber-300 tabular-nums tracking-wider">{game.gold}</span>
					</div>
					<div className="flex h-[48px] w-[64px] flex-col items-center justify-center rounded-none border-[3px] border-[#3a2a1a] bg-[#120d05] px-1.5 shadow-[3px_3px_0_#2a1d0a]">
						<span className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8a7340]">♥</span>
						<span className="text-xs font-black text-red-300 tabular-nums tracking-wider">{game.lives}</span>
					</div>
				</div>
				</div>
			</div>

			</main>
		)
	)
}
