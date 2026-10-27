'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

import GameCanvas from '@/components/game/GameCanvas'
import GameMenu from '@/components/game/GameMenu'
import TowerDetails from '@/components/game/TowerDetails'
import AuthScreen from '@/components/menu/AuthScreen'
import LandingScreen from '@/components/menu/LandingScreen'
import LeaderboardScreen from '@/components/menu/LeaderboardScreen'
import MainMenu from '@/components/menu/MainMenu'
import ProfileScreen from '@/components/menu/ProfileScreen'
import type { PlayerProfile } from '@/features/account/types'
import { TOWER_TYPES, type TowerType } from '@/features/game/config/game.config'
import { generateUpgradeCards, type UpgradeCard } from '@/features/game/domain/upgrade-cards'
import { initialResources } from '@/features/game/domain/game-rules'

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
	sellValue: number
}

type GameState = {
	wave: number
	gold: number
	lives: number
	enemies: number
	selectedTower: TowerType | null
	selectedBuiltTower: SelectedTowerInfo | null
	panelPosition: { x: number; y: number } | null
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
	selectedTower: null,
	selectedBuiltTower: null,
	panelPosition: null,
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

type Screen = 'landing' | 'auth' | 'menu' | 'profile' | 'leaderboard' | 'game'

export default function HomePage() {
	const [screen, setScreen] = useState<Screen>('landing')
	const [game, setGame] = useState<GameState>(initialState)
	const [scores, setScores] = useState<Score[]>([])
	const [topScores, setTopScores] = useState<Score[]>([])
	const [user, setUser] = useState<PlayerProfile | null>(null)
	const [token, setToken] = useState<string | null>(null)
	const [showLeaderboard, setShowLeaderboard] = useState(false)
	const [showInfo, setShowInfo] = useState(false)
	const [showGameMenu, setShowGameMenu] = useState(false)
	const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([])
	const [cardsShown, setCardsShown] = useState(false)

	const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
	const [authLogin, setAuthLogin] = useState('')
	const [authEmail, setAuthEmail] = useState('')
	const [authPassword, setAuthPassword] = useState('')
	const [authLoading, setAuthLoading] = useState(false)
	const [authError, setAuthError] = useState('')
	const [authNotice, setAuthNotice] = useState('')
	const [authChecked, setAuthChecked] = useState(false)

	useEffect(() => {
		const handleState = (event: Event) =>
			setGame((prev) => ({ ...prev, ...(event as CustomEvent<Partial<GameState>>).detail }))
		const handleGameOver = (event: Event) => {
			const detail = (event as CustomEvent<Pick<Score, 'wave' | 'gold'>>).detail
			if (detail && Number.isFinite(detail.wave) && Number.isFinite(detail.gold)) {
				setScores(saveScore(detail))
				setUser((prev) => prev ? { ...prev, record: Math.max(prev.record, detail.gold) } : prev)
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
		const stored = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
		if (!stored) {
			queueMicrotask(() => setAuthChecked(true))
			return
		}

		fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + stored } })
			.then((r) => r.json())
			.then((d) => {
				setToken(stored)
				if (d.user) {
					setUser(d.user)
					setGame((prev) => ({ ...prev, gold: d.user.record || 0 }))
				} else {
					localStorage.removeItem('td_token')
					setToken(null)
				}
			})
			.catch(() => setToken(stored))
			.finally(() => setAuthChecked(true))
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
	const sellTower = () => window.dispatchEvent(new CustomEvent('td:sell-tower'))
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
		setAuthNotice('')
		setAuthLoading(true)
		const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
		const body = authMode === 'login'
			? JSON.stringify({ login: authLogin, password: authPassword })
			: JSON.stringify({ login: authLogin, email: authEmail, password: authPassword })
		try {
			const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
			const data = await res.json()
			if (!res.ok) {
				setAuthError(data.error || 'Ошибка')
				return
			}
			if (data.token) {
				localStorage.setItem('td_token', data.token)
				setToken(data.token)
				setAuthPassword('')
				try {
					const me = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + data.token } })
					const meData = await me.json()
					if (meData.user) {
						setUser(meData.user)
						setGame((prev) => ({ ...prev, gold: meData.user.record || 0 }))
					}
				} catch { }
				setScreen('menu')
			} else {
				setAuthMode('login')
				setAuthNotice('Аккаунт создан — войдите')
			}
		} catch { setAuthError('Ошибка сети') } finally { setAuthLoading(false) }
	}

	const waveButtonDisabled = !game.gameOver && (game.waveActive || game.wave > 0)

	const handleStart = () => setScreen(token ? 'menu' : 'auth')

	const logout = () => {
		localStorage.removeItem('td_token')
		setToken(null)
		setUser(null)
		setScreen('landing')
		setShowGameMenu(false)
		setShowInfo(false)
		setShowLeaderboard(false)
		setGame(initialState)
		setUpgradeCards([])
		setCardsShown(false)
	}

	const startSinglePlayer = () => {
		setGame(initialState)
		setUpgradeCards([])
		setCardsShown(false)
		setShowGameMenu(false)
		setShowInfo(false)
		setShowLeaderboard(false)
		setScreen('game')
	}

	const refreshUser = async () => {
		if (!token) return
		try {
			const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
			const data = await res.json()
			if (data.user) {
				setUser(data.user)
				setGame((prev) => ({ ...prev, gold: data.user.record || 0 }))
			}
		} catch { }
	}

	const refreshTopScores = async () => {
		try {
			const res = await fetch('/api/scores/top?limit=50')
			const data = await res.json()
			if (data.scores) setTopScores(data.scores)
		} catch {
			setTopScores(readScores())
		}
	}

	const openProfile = () => {
		setShowGameMenu(false)
		setScreen('profile')
		void refreshUser()
		void refreshTopScores()
	}

	const openLeaderboard = () => {
		setShowGameMenu(false)
		setScreen('leaderboard')
		void refreshTopScores()
	}

	if (!authChecked) {
		return (
			<main className="flex h-[100dvh] w-full items-center justify-center bg-[url(/game/background.png)] bg-cover bg-center font-mono">
				<div className="border-2 border-[#3a2a1a] bg-[#0f0a05]/90 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-amber-300 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					Загрузка...
				</div>
			</main>
		)
	}

	if (screen === 'landing') {
		return <LandingScreen onStart={handleStart} />
	}

	if (screen === 'auth') {
		return (
			<AuthScreen
				mode={authMode}
				login={authLogin}
				email={authEmail}
				password={authPassword}
				loading={authLoading}
				error={authError}
				notice={authNotice}
				onModeChange={(mode) => {
					setAuthMode(mode)
					setAuthError('')
					setAuthNotice('')
				}}
				onLoginChange={setAuthLogin}
				onEmailChange={setAuthEmail}
				onPasswordChange={setAuthPassword}
				onSubmit={handleAuth}
				onBack={() => setScreen('landing')}
			/>
		)
	}

	if (screen === 'menu') {
		return (
			<MainMenu
				user={user}
				onSingle={startSinglePlayer}
				onProfile={openProfile}
				onLeaderboard={openLeaderboard}
				onLogout={logout}
			/>
		)
	}

	if (screen === 'profile') {
		return <ProfileScreen user={user} scores={topScores} onBack={() => setScreen('menu')} />
	}

	if (screen === 'leaderboard') {
		return (
			<LeaderboardScreen
				scores={topScores}
				currentUserId={user?.id}
				onBack={() => setScreen('menu')}
			/>
		)
	}

	return (
		<main className="h-[100dvh] w-full overflow-hidden bg-[#4a7f2a] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 relative flex flex-col">
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
						onClick={() => {
							setShowLeaderboard(!showLeaderboard)
							setShowInfo(false)
						}}
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

					{/* Информация об управлении */}
					<button
						onClick={() => {
							setShowInfo(!showInfo)
							setShowLeaderboard(false)
						}}
						className="
							group relative flex h-10 w-10 items-center justify-center
							border-2 border-[#79502b]
							bg-[#21150c]
							text-amber-300
							shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)]
							transition-all duration-150
							hover:border-sky-400
							hover:bg-[#1b2b33]
							hover:text-sky-200
							hover:shadow-[inset_0_1px_0_rgba(150,220,255,0.18),0_3px_0_#100904,0_0_12px_rgba(56,189,248,0.25)]
							active:translate-y-[2px]
							active:shadow-[0_1px_0_#100904]
							focus-visible:outline-none
							focus-visible:ring-2
							focus-visible:ring-sky-400
						"
						aria-label="Информация об управлении"
						title="Управление"
						aria-expanded={showInfo}
					>
						{/* Внутренняя рамка */}
						<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-sky-400/40" />

						{/* Иконка информации */}
						<svg
							viewBox="0 0 24 24"
							className="relative h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110"
							fill="none"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
							<path d="M12 11V17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
							<rect x="11" y="6.4" width="2" height="2.6" fill="currentColor" />
						</svg>

						{/* Индикатор открытой панели */}
						{showInfo && (
							<span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-[#21150c] bg-sky-400 shadow-[0_0_5px_#38bdf8]" />
						)}
					</button>

					<button
						onClick={() => {
							setShowGameMenu(true)
							setShowInfo(false)
							setShowLeaderboard(false)
						}}
						className="
							group relative flex h-10 w-10 items-center justify-center
							border-2 border-[#79502b]
							bg-[#21150c]
							text-amber-300
							shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)]
							transition-all duration-150
							hover:border-amber-400
							hover:bg-[#493713]
							hover:text-yellow-200
							hover:shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_3px_0_#100904,0_0_12px_rgba(250,204,21,0.25)]
							active:translate-y-[2px]
							active:shadow-[0_1px_0_#100904]
							focus-visible:outline-none
							focus-visible:ring-2
							focus-visible:ring-amber-400
						"
						aria-label="Меню игры"
						title="Меню игры"
						aria-expanded={showGameMenu}
					>
						{/* Внутренняя рамка */}
						<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />

						{/* Иконка меню */}
						<svg
							viewBox="0 0 16 16"
							className="relative h-5 w-5 transition-transform duration-150 group-hover:scale-110"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M3 4H13M3 8H13M3 12H13"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="square"
							/>
						</svg>
					</button>
				</div>

				{/* Game menu */}
				{showGameMenu && (
					<GameMenu
						onClose={() => setShowGameMenu(false)}
						onProfile={openProfile}
						onMainMenu={() => {
							setShowGameMenu(false)
							setScreen('menu')
						}}
						onLogout={logout}
					/>
				)}

				{/* Leaderboard mini overlay */}
				{showLeaderboard && (
					<div className="absolute top-[60px] right-3 z-50 w-56 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_8px_24px_rgba(0,0,0,0.9)] overflow-hidden">
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

				{/* Информация об управлении */}
				{showInfo && (
					<div className="absolute top-[60px] right-3 z-50 w-60 max-h-[70vh] overflow-y-auto rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
						<div className="sticky top-0 flex items-center justify-between border-b border-[#3a2a1a]/60 bg-[#1a1208] px-3 py-2">
							<span className="text-[10px] font-black uppercase tracking-[0.15em] text-sky-300">Управление</span>
							<button onClick={() => setShowInfo(false)} className="text-[12px] font-black leading-none text-[#8a7340] hover:text-sky-300" aria-label="Закрыть">×</button>
						</div>

						<div className="space-y-2 px-3 py-2">
							<div>
								<p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Камера</p>
								<ul className="space-y-1 text-[10px] font-bold leading-snug text-amber-100">
									<li><span className="text-amber-400">WASD / стрелки</span> — движение</li>
									<li><span className="text-amber-400">ПКМ / СКМ + тянуть</span> — сдвиг карты</li>
									<li><span className="text-amber-400">Колесо</span> — зум</li>
									<li><span className="text-amber-400">Край экрана</span> — прокрутка (ПК)</li>
									<li><span className="text-amber-400">Телефон</span>: свайп — камера, два пальца — зум</li>
								</ul>
							</div>

							<div className="border-t border-[#3a2a1a]/50 pt-2">
								<p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Игра</p>
								<ul className="space-y-1 text-[10px] font-bold leading-snug text-amber-100">
									<li><span className="text-amber-400">ЛКМ</span> по клетке — построить / выбрать башню</li>
									<li><span className="text-amber-400">Наведение</span> — предпросмотр выбранной башни</li>
									<li><span className="text-amber-400">1–3</span> — тип башни, <span className="text-amber-400">4 / Esc</span> — снять выбор</li>
									<li><span className="text-amber-400">U</span> — улучшить, продажа — кнопка в панели</li>
									<li><span className="text-amber-400">Пробел</span> — запустить волну</li>
									<li><span className="text-amber-400">R</span> — рестарт после поражения</li>
								</ul>
							</div>

							<div className="border-t border-[#3a2a1a]/50 pt-2">
								<p className="text-[10px] font-bold leading-snug text-[#b5a17b]">
									Цель — защитить замок в центре карты и не пропустить врагов.
								</p>
							</div>
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
						<div
							className={
								game.panelPosition
									? 'absolute z-50 w-[232px]'
									: 'absolute top-14 right-3 z-50 w-[232px]'
							}
							style={
								game.panelPosition
									? { left: game.panelPosition.x, top: game.panelPosition.y }
									: undefined
							}
						>
							<TowerDetails
								name={game.selectedBuiltTower.name}
								level={game.selectedBuiltTower.level}
								maxLevel={game.selectedBuiltTower.maxLevel}
								damage={game.selectedBuiltTower.damage}
								range={game.selectedBuiltTower.range}
								attackSpeed={game.selectedBuiltTower.attackSpeed}
								upgradeCost={game.selectedBuiltTower.upgradeCost}
								sellValue={game.selectedBuiltTower.sellValue}
								gold={game.gold}
								onUpgrade={upgradeTower}
								onSell={sellTower}
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
				<div className="absolute bottom-[16px] sm:bottom-[50px] left-1/2 z-40 w-[98vw] sm:w-max max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-24px)] -translate-x-1/2 px-1 sm:px-2">
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
					<div className="relative flex h-[52px] sm:h-[72px] max-w-full items-center gap-1.5 sm:gap-2 rounded-b-sm border-2 border-t-0 border-[#79552c] bg-[#0f0a05]/90 px-1.5 sm:px-2 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a,0_0_14px_rgba(0,0,0,0.25)] backdrop-blur-md">
						{/* Золото */}
						<div className="flex h-[36px] sm:h-[48px] shrink-0 items-center gap-1.5 sm:gap-2 border border-[#8b651f] bg-gradient-to-b from-[#49300e] to-[#241606] px-2 sm:px-3 shadow-[inset_0_1px_0_#c99b3b]">
							<span className="text-xl drop-shadow-[0_0_5px_#facc15]">
								🪙
							</span>

							<div className="flex flex-col leading-tight">
								<span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#c5a76b]">
									Золото
								</span>

								<span className="text-sm sm:text-base font-black tabular-nums text-yellow-300 drop-shadow-[0_0_4px_#ca8a04]">
									{game.gold}
								</span>
							</div>
						</div>

						{/* Разделитель */}
						<div className="h-8 sm:h-10 w-px shrink-0 bg-[#5c3a1a]" />

						{/* Карточки башен */}
						<div className="flex min-w-0 items-center gap-1 sm:gap-2">
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
										className={`group relative flex h-[38px] sm:h-[48px] w-[60px] sm:w-[76px] shrink-0 flex-col items-center justify-center border-2 transition-colors cursor-pointer ${isSelected
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
											className="h-[22px] w-[22px] sm:h-[30px] sm:w-[30px] object-contain [image-rendering:pixelated]"
										/>

										{/* Название башни */}
										<span
											className={`mt-0.5 max-w-full truncate px-1 text-[8px] sm:text-[10px] font-bold leading-none ${isSelected ? 'text-yellow-200' : 'text-[#d6c4a3]'
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
						<div className="h-8 sm:h-10 w-px shrink-0 bg-[#5c3a1a]" />

						{/* Управление волнами */}
						<button
							type="button"
							onClick={game.gameOver ? restartGame : startWave}
							disabled={waveButtonDisabled}
							className={`flex h-[42px] sm:h-[48px] shrink-0 flex-col items-center justify-center border-2 px-2 sm:px-3 text-center font-black transition-colors ${game.gameOver
								? 'border-red-400 bg-red-900 text-red-100 hover:bg-red-800'
								: game.waveActive
									? 'cursor-not-allowed border-[#5c3a1a] bg-[#21170d] text-[#8c785a]'
									: 'border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65] hover:from-[#628e33] hover:to-[#3d6022]'
								}`}
						>
							<span className="text-[9px] sm:text-[11px] uppercase tracking-wide cursor-pointer">
								{game.gameOver
									? 'Заново'
									: game.waveActive
										? 'Волна идёт'
										: game.wave > 0
											? 'Следующая волна'
											: 'Начать волну'}
							</span>

							{!game.gameOver && (
								<span className="mt-0.5 text-[8px] sm:text-[10px] font-semibold opacity-80">
									{game.waveActive ? `Волна ${game.wave}` : `Волна ${game.wave + 1}`}
								</span>
							)}
						</button>
					</div>
				</div>
			</main>
	)
}
