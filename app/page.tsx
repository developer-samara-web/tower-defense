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
		}).catch(() => { })
	}
	const next = [
		{ id: crypto.randomUUID(), wave: detail.wave, gold: detail.gold, createdAt: new Date().toISOString() },
		...readScores(),
	].sort((a, b) => b.wave - a.wave || b.gold - a.gold).slice(0, MAX_SCORES)
	try { localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(next)) } catch { }
	return next
}

export default function HomePage() {
	const [game, setGame] = useState<GameState>(initialState)
	const [scores, setScores] = useState<Score[]>([])
	const [showLeaderboard, setShowLeaderboard] = useState(false)
	const [showInfo, setShowInfo] = useState(false)
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
				.catch(() => { })
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
			<main className="h-[103dvh] w-full overflow-hidden bg-gradient-to-b from-[#0a0e12] via-[#141820] to-[#0a0e12] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 flex items-center justify-center px-4 bg-[url(/game/background.png)] bg-cover">
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
			<main className="h-[103dvh] w-full overflow-hidden bg-gradient-to-b from-[#0a0e12] via-[#141820] to-[#0a0e12] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 flex items-center justify-center px-4 bg-[url(/game/background.png)] bg-cover">
				<div className="w-full max-w-md rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] p-6 sm:p-8">
					<div className="mb-6 flex flex-col items-center gap-3">
						<Image src="/game/logo.png" alt="Legends of Prigranica" width={220} height={110} priority className="drop-shadow-[0_4px_8px_rgba(212,160,60,0.25)]" />
					</div>
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
			<main className="h-[103dvh] w-full overflow-hidden bg-[#4a7f2a] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 relative flex flex-col">
				{/* Logo top-left */}
				<div className="absolute top-3 left-3 z-40 pointer-events-none drop-shadow-lg">
					<Image src="/game/logo.png" alt="Logo" width={120} height={60} className="opacity-90" />
				</div>

				{/* Top-right: hint + leaderboard + menu/profile */}
				<div className="absolute top-3 right-3 z-40 flex items-center gap-2">
					<div className="rounded-none border border-[#3a2a1a]/70 bg-[#0f0a05]/70 px-2 py-1 shadow-[2px_2px_0_#1a1008] backdrop-blur-sm">
						<p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#b5a17b]">WASD · Колесо</p>
					</div>
					<button
						onClick={() => setShowLeaderboard(!showLeaderboard)}
						className="
							group relative flex h-10 w-10 items-center justify-center
							border-2 border-[#79502b]
							bg-[#21150c]
							text-amber-300
							shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)]
							transition-all duration-150
							hover:border-yellow-400
							hover:bg-[#493713]
							hover:text-yellow-200
							hover:shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_3px_0_#100904,0_0_12px_rgba(250,204,21,0.25)]
							active:translate-y-[2px]
							active:shadow-[0_1px_0_#100904]
							focus-visible:outline-none
							focus-visible:ring-2
							focus-visible:ring-amber-400
						"
						aria-label="Топ игроков"
						title="Топ игроков"
						aria-expanded={showLeaderboard}
					>
						{/* Внутренняя рамка */}
						<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />

						{/* Иконка рейтинга */}
						<svg
							viewBox="0 0 24 24"
							className="relative h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110"
							fill="none"
							aria-hidden="true"
						>
							{/* Медаль */}
							<path
								d="M7 3H17L15 10H9L7 3Z"
								fill="currentColor"
								fillOpacity="0.2"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinejoin="miter"
							/>

							{/* Ленты */}
							<path
								d="M8 10L6 20L12 16L18 20L16 10"
								fill="#9b6729"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinejoin="miter"
							/>

							{/* Звезда */}
							<path
								d="M12 5L13.2 7.4L15.8 7.8L13.9 9.6L14.4 12.2L12 10.9L9.6 12.2L10.1 9.6L8.2 7.8L10.8 7.4L12 5Z"
								fill="currentColor"
								stroke="currentColor"
								strokeWidth="0.5"
								strokeLinejoin="miter"
							/>
						</svg>

						{/* Индикатор открытого рейтинга */}
						{showLeaderboard && (
							<span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-[#21150c] bg-yellow-400 shadow-[0_0_5px_#facc15]" />
						)}
					</button>
					<button
						onClick={() => {
							if (token) {
								localStorage.removeItem('td_token')
								window.location.reload()
							}
						}}
						className="
							group relative flex h-10 w-10 items-center justify-center
							border-2 border-[#79502b]
							bg-[#21150c]
							text-amber-300
							shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)]
							transition-all duration-150
							hover:border-red-500
							hover:bg-[#421b13]
							hover:text-red-300
							hover:shadow-[inset_0_1px_0_rgba(255,150,100,0.15),0_3px_0_#100904,0_0_12px_rgba(239,68,68,0.2)]
							active:translate-y-[2px]
							active:shadow-[0_1px_0_#100904]
							focus-visible:outline-none
							focus-visible:ring-2
							focus-visible:ring-amber-400
						"
						aria-label="Меню / Выход"
						title="Меню / Выход"
					>
						{/* Внутренняя рамка */}
						<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-red-400/40" />

						{/* Иконка закрытия */}
						<svg
							viewBox="0 0 16 16"
							className="relative h-5 w-5 transition-transform duration-150 group-hover:rotate-90"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M4 4L12 12M12 4L4 12"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="square"
							/>
						</svg>
					</button>

					{/* Мини-профиль / инструкция */}
					{showInfo && (
						<div className="absolute top-14 right-3 z-50 w-52 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_8px_24px_rgba(0,0,0,0.9)] overflow-hidden">
							<div className="flex items-center justify-between border-b border-[#3a2a1a]/60 px-3 py-2">
								<span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-300">Игрок</span>
								<button onClick={() => setShowInfo(false)} className="text-[10px] font-black text-[#8a7340] hover:text-amber-300">×</button>
							</div>
							<div className="px-3 py-2 space-y-1">
								<p className="text-[9px] font-bold text-[#8a7340] tracking-wide">Управление</p>
								<p className="text-[10px] text-amber-100 leading-snug">ЛКМ — башня · ПКМ/СКМ — камера · WASD — движение · Колесо — зум</p>

							{token && (
								<div className="mt-2 pt-2 border-t border-[#3a2a1a]/40 space-y-1">
									<p className="text-[9px] font-black text-amber-300 tracking-wide">Авторизован</p>
									<button
										onClick={() => { localStorage.removeItem('td_token'); window.location.reload() }}
										className="w-full rounded-none border border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#f5e6c8] shadow-[0_2px_0_#3a1d0a] hover:from-[#9b6a3e] hover:to-[#6a3a1e] transition"
									>
										Выход
									</button>
								</div>
							)}
						</div>
					</div>
				)}
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
				<div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-30 w-full max-w-[640px] px-2 pointer-events-none">
					<div className="flex justify-center">
						<div className="rounded-none bg-[#0f0a05]/90 border-[3px] border-[#2a1d0a] px-4 py-1 shadow-[4px_4px_0_#1a0f05,0_0_0_#000] backdrop-blur-sm">
							<p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f5e6c8] drop-shadow-[0_2px_4px_rgba(0,0,0,1),0_1px_0_#5c2d0e]">{game.status}</p>
						</div>
					</div>
				</div>

				{/* Bottom compact pixel-art bar — full width, no fixed max */}
				<div className="absolute bottom-[50px] left-1/2 z-40 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 px-2">
					{/* HP-бар замка */}
					<div
						className="relative h-[13px] w-full overflow-hidden border-2 border-[#68451f] bg-[#21100c] shadow-[inset_0_1px_3px_#000]"
						role="progressbar"
						aria-label="Здоровье замка"
						aria-valuemin={0}
						aria-valuemax={20}
						aria-valuenow={Math.max(0, Math.min(20, game.lives))}
					>
						{/* Заполнение здоровья */}
						<div
							className={`absolute inset-y-0 left-0 transition-[width] duration-300 ${game.lives / 20 <= 0.25
								? 'bg-[#e53935]'
								: game.lives / 20 <= 0.5
									? 'bg-[#f2b632]'
									: 'bg-[#65c943]'
								}`}
							style={{
								width: `${Math.max(0, Math.min(100, (game.lives / 20) * 100))}%`
							}}
						>
							{/* Пиксельный блик */}
							<div className="absolute inset-x-0 top-0 h-[2px] bg-white/30" />
						</div>

						{/* Разделители сегментов */}
						<div
							className="pointer-events-none absolute inset-0"
							style={{
								backgroundImage:
									'repeating-linear-gradient(to right, transparent 0, transparent calc(5% - 1px), #21100c calc(5% - 1px), #21100c 5%)'
							}}
						/>

						{/* Тонкая внутренняя рамка */}
						<div className="pointer-events-none absolute inset-0 border-t border-white/10 border-b border-black/40" />
					</div>

					{/* Основная панель */}
					<div className="relative flex h-[72px] max-w-full items-center gap-2 rounded-b-sm border-2 border-t-0 border-[#79552c] bg-[#0f0a05]/90 px-2 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a,0_0_14px_rgba(0,0,0,0.25)] backdrop-blur-md">
						{/* Золото */}
						<div className="flex h-[48px] shrink-0 items-center gap-2 border border-[#8b651f] bg-gradient-to-b from-[#49300e] to-[#241606] px-3 shadow-[inset_0_1px_0_#c99b3b]">
							<span className="text-xl drop-shadow-[0_0_5px_#facc15]">
								🪙
							</span>

							<div className="flex flex-col leading-tight">
								<span className="text-[9px] font-bold uppercase tracking-wider text-[#c5a76b]">
									Золото
								</span>

								<span className="text-base font-black tabular-nums text-yellow-300 drop-shadow-[0_0_4px_#ca8a04]">
									{game.gold}
								</span>
							</div>
						</div>

						{/* Разделитель */}
						<div className="h-10 w-px shrink-0 bg-[#5c3a1a]" />

						{/* Карточки башен */}
						<div className="flex min-w-0 items-center gap-2">
							{towers.map((tower) => {
								const isSelected = game.selectedTower === tower.id
								const canAfford = game.gold >= tower.cost

								return (
									<button
										key={tower.id}
										type="button"
										onClick={() => selectTower(tower.id)}
										title={tower.name}
										aria-label={`${tower.name}, цена ${tower.cost} золота`}
										aria-pressed={isSelected}
										className={`group relative flex h-[48px] w-[76px] shrink-0 flex-col items-center justify-center border-2 transition-colors cursor-pointer ${isSelected
											? 'border-yellow-400 bg-[#493713] shadow-[0_0_8px_#eab30866]'
											: 'border-[#5c3a1a] bg-[#21170d] hover:border-[#a67c36] hover:bg-[#352411]'
											}`}
									>
										{/* Иконка башни */}
										<Image
											src={tower.image}
											alt={tower.name}
											width={30}
											height={30}
											className="h-[30px] w-[30px] object-contain [image-rendering:pixelated]"
										/>

										{/* Название башни */}
										<span
											className={`mt-0.5 max-w-full truncate px-1 text-[10px] font-bold leading-none ${isSelected ? 'text-yellow-200' : 'text-[#d6c4a3]'
												}`}
										>
											{tower.name}
										</span>

										{/* Цена при наведении */}
										<span
											className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${canAfford
												? 'border border-[#a67c36] bg-[#eabf4b] text-[#38230a]'
												: 'border border-[#79503a] bg-[#34251b] text-red-300'
												} whitespace-nowrap px-3 py-1.5 text-xs font-black shadow-[2px_3px_0_#1a1006]`}
										>
											🪙 {tower.cost} золота

											{/* Указатель подсказки */}
											<span
												className={`absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r ${canAfford
													? 'border-[#a67c36] bg-[#eabf4b]'
													: 'border-[#79503a] bg-[#34251b]'
													}`}
											/>
										</span>
									</button>
								)
							})}
						</div>

						{/* Разделитель */}
						<div className="h-10 w-px shrink-0 bg-[#5c3a1a]" />

						{/* Управление волнами */}
						<button
							type="button"
							onClick={game.gameOver ? restartGame : startWave}
							disabled={waveButtonDisabled}
							className={`flex h-[48px] shrink-0 flex-col items-center justify-center border-2 px-3 text-center font-black transition-colors ${game.gameOver
								? 'border-red-400 bg-red-900 text-red-100 hover:bg-red-800'
								: game.waveActive
									? 'cursor-not-allowed border-[#5c3a1a] bg-[#21170d] text-[#8c785a]'
									: 'border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65] hover:from-[#628e33] hover:to-[#3d6022]'
								}`}
						>
							<span className="text-[11px] uppercase tracking-wide cursor-pointer">
								{game.gameOver
									? 'Заново'
									: game.waveActive
										? 'Волна идёт'
										: game.wave > 0
											? 'Следующая волна'
											: 'Начать волну'}
							</span>

							{!game.gameOver && (
								<span className="mt-0.5 text-[10px] font-semibold opacity-80">
									{game.waveActive ? `Волна ${game.wave}` : `Волна ${game.wave + 1}`}
								</span>
							)}
						</button>
					</div>
				</div>
			</main>
		)
	)
}
