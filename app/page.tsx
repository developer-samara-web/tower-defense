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
type ActiveTab = 'controls' | 'scores'

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
	image: tower.image
}))

function readScores(): Score[] {
	try {
		const stored = localStorage.getItem(SCORE_STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored) as Score[]
			return Array.isArray(parsed) ? parsed.slice(0, MAX_SCORES) : []
		}
	} catch {
		return []
	}
	return []
}

function saveScore(detail: Pick<Score, 'wave' | 'gold'>): Score[] {
	const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
	if (token) {
		fetch('/api/scores/update', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer ' + token,
			},
			body: JSON.stringify({ gold: detail.gold }),
		})
			.catch(() => { })
	}

	const next = [
		{
			id: crypto.randomUUID(),
			wave: detail.wave,
			gold: detail.gold,
			createdAt: new Date().toISOString(),
		},
		...readScores(),
	]
		.sort((first, second) => second.wave - first.wave || second.gold - first.gold)
		.slice(0, MAX_SCORES)

	try {
		localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Хранилище может быть недоступно (приватный режим) — рекорды просто не сохранятся.
	}

	return next
}

export default function HomePage() {
	const [game, setGame] = useState<GameState>(initialState)
	const [scores, setScores] = useState<Score[]>([])
	const [activeTab, setActiveTab] = useState<ActiveTab>('controls')

	useEffect(() => {
		const handleState = (event: Event) =>
			setGame((previous) => ({
				...previous,
				...(event as CustomEvent<Partial<GameState>>).detail,
			}))

		const handleGameOver = (event: Event) => {
			const detail = (event as CustomEvent<Pick<Score, 'wave' | 'gold'>>).detail
			if (!detail || !Number.isFinite(detail.wave) || !Number.isFinite(detail.gold)) {
				return
			}
			setScores(saveScore(detail))
		}

		window.addEventListener('td:state', handleState)
		window.addEventListener('td:game-over', handleGameOver)
		return () => {
			window.removeEventListener('td:state', handleState)
			window.removeEventListener('td:game-over', handleGameOver)
		}
	}, [])

	const selectTower = (towerId: TowerType) =>
		window.dispatchEvent(new CustomEvent('td:select-tower', { detail: { towerId } }))

	const startWave = () => window.dispatchEvent(new CustomEvent('td:start-wave'))

	const upgradeTower = () => window.dispatchEvent(new CustomEvent('td:upgrade-tower'))

	const deselectTower = () => window.dispatchEvent(new CustomEvent('td:deselect-tower'))

	// Применяет выбранную карточку и скрывает окно с выбором.
	const pickUpgrade = (card: UpgradeCard) => {
		window.dispatchEvent(new CustomEvent('td:pick-upgrade', { detail: { card } }))
		setUpgradeCards([])
		setCardsShown(true)
	}

	const restartGame = () => {
		setGame(initialState)
		window.dispatchEvent(new CustomEvent('td:restart'))
	}

	const tabClass = (tab: ActiveTab) =>
		`flex-1 rounded-none border-b-2 px-2 py-2 text-xs font-bold uppercase tracking-wider transition ${activeTab === tab
			? 'border-amber-300 bg-[#2a1d0a]/60 text-amber-200'
			: 'border-transparent bg-[#1a1208]/40 text-stone-400 hover:text-amber-100 hover:bg-[#2a1d0a]/30'
		}`

	const waveButtonLabel = game.gameOver
		? 'ИГРАТЬ ЗАНОВО'
		: game.waveActive
			? 'ВОЛНА ИДЁТ'
			: game.wave === 0
				? 'ЗАПУСТИТЬ ВОЛНУ'
				: game.nextWaveIn > 0
					? `ВОЛНА ${game.wave + 1} ЧЕРЕЗ ${game.nextWaveIn}`
					: 'ПОДГОТОВКА…'

	const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
	const [authLogin, setAuthLogin] = useState('')
	const [authEmail, setAuthEmail] = useState('')
	const [authPassword, setAuthPassword] = useState('')
	const [authLoading, setAuthLoading] = useState(false)
	const [authError, setAuthError] = useState('')
	const [authChecked, setAuthChecked] = useState(false)
	const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([])
	const [cardsShown, setCardsShown] = useState(false)

	useEffect(() => {
		fetch('/api/scores/top')
			.then((r) => r.json())
			.then((data) => {
				if (data.scores) setScores(data.scores)
			})
			.catch(() => setScores(readScores()))
	}, [])

	useEffect(() => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
		if (token) {
			fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
				.then((r) => r.json())
				.then((data) => {
					if (data.user) setGame((prev) => ({ ...prev, gold: data.user.record || 0 }))
				})
				.catch(() => { })
				.finally(() => setAuthChecked(true))
		} else {
			// Откладываем обновление состояния, чтобы не вызывать setState
			// синхронно внутри эффекта.
			queueMicrotask(() => setAuthChecked(true))
		}
	}, [])

	useEffect(() => {
		const isUpgradeWave = game.wave > 0 && game.wave % 5 === 0

		if (isUpgradeWave && !cardsShown) {
			// Каждые 5 волн игрок получает 3 случайные карточки улучшений.
			setUpgradeCards(generateUpgradeCards(3))
			setCardsShown(true)
		}

		if (!isUpgradeWave && cardsShown) {
			setUpgradeCards([])
			setCardsShown(false)
		}
	}, [game.wave, cardsShown])

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault()
		setAuthError('')
		setAuthLoading(true)

		const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
		const body = authMode === 'login'
			? JSON.stringify({ login: authLogin, password: authPassword })
			: JSON.stringify({ login: authLogin, email: authEmail, password: authPassword })

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
			})
			const data = await res.json()
			if (!res.ok) {
				setAuthError(data.error || 'Ошибка')
			} else if (data.token) {
				localStorage.setItem('td_token', data.token)
				window.location.reload()
			} else {
				setAuthMode('login')
				setAuthError('')
			}
		} catch {
			setAuthError('Ошибка сети')
		} finally {
			setAuthLoading(false)
		}
	}

	const waveButtonDisabled = !game.gameOver && (game.waveActive || game.wave > 0)

	const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null

	return (
		!authChecked ? (
			<main className="h-dvh w-full overflow-hidden bg-gradient-to-b from-[#0a0e12] via-[#141820] to-[#0a0e12] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 flex items-center justify-center px-4">
				<div className="flex flex-col items-center gap-4">
					<h1 className="text-3xl font-black uppercase tracking-[0.25em] text-amber-300 drop-shadow-[0_4px_0_#5c2d0e] animate-pulse">
						ЗАГРУЗКА
					</h1>
					<div className="flex gap-2">
						{[...Array(3)].map((_, i) => (
							<span
								key={i}
								className="h-4 w-4 rounded-none bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] animate-bounce"
								style={{ animationDelay: `${i * 150}ms` }}
							/>
						))}
					</div>
					<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a5e30]">Проверка врат замка…</p>
				</div>
			</main>
		) : !token ? (
			<main className="h-dvh w-full overflow-hidden bg-gradient-to-b from-[#0a0e12] via-[#141820] to-[#0a0e12] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 flex items-center justify-center px-4 bg-[url(/game/background.png)] bg-cover">
				<div className="w-full max-w-md rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] p-6 sm:p-8">
					<h1 className="text-center text-2xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e] mb-6">Врата Замка</h1>

					<form onSubmit={handleAuth} className="space-y-4">
						<div className="flex rounded-none border-2 border-[#3a2a1a] overflow-hidden bg-[#0f0a05]/30">
							<button
								type="button"
								className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${authMode === 'login' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'}`}
								onClick={() => setAuthMode('login')}
							>
								Вход
							</button>
							<button
								type="button"
								className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${authMode === 'register' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'}`}
								onClick={() => setAuthMode('register')}
							>
								Регистрация
							</button>
						</div>

						<input
							type="text"
							placeholder="Логин"
							value={authLogin}
							onChange={(e) => setAuthLogin(e.target.value)}
							className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600"
						/>

						{authMode === 'register' && (
							<input
								type="email"
								placeholder="Почта"
								value={authEmail}
								onChange={(e) => setAuthEmail(e.target.value)}
								className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600"
							/>
						)}

						<input
							type="password"
							placeholder="Пароль"
							value={authPassword}
							onChange={(e) => setAuthPassword(e.target.value)}
							className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:outline-none focus:border-amber-600"
						/>

						{authError && (
							<p className="text-xs font-black text-red-400 tracking-wide">{authError}</p>
						)}

						<button
							type="submit"
							disabled={authLoading}
							className="w-full rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] py-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5e6c8] shadow-[0_4px_0_#3a1d0a] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[2px] active:shadow-[0_2px_0_#3a1d0a] disabled:opacity-40"
						>
							{authLoading ? 'Загрузка...' : authMode === 'login' ? 'Войти в Замок' : 'Создать Героя'}
						</button>
					</form>
				</div>
			</main>
		) : (
			<main className="h-dvh w-full overflow-hidden bg-[#3e722b] bg-[url(/game/background.png)] bg-cover bg-center bg-no-repeat text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100">
				<div className="flex h-full w-full flex-col lg:flex-row">
					<section className="relative min-h-0 flex-1 overflow-hidden">
						<GameCanvas />
						<div className="pointer-events-none absolute bottom-3 left-3 z-40 max-w-[calc(100%-1.5rem)] border border-[#3a2a1a]/80 bg-[#0f0a05]/75 px-2 py-1.5 text-[9px] font-bold uppercase leading-relaxed tracking-[0.1em] text-[#a89060] shadow-[0_2px_0_rgba(0,0,0,0.5)]">
							ЛКМ — башня · ПКМ/СКМ — камера · WASD — движение · Колесо — зум
						</div>
						{upgradeCards.length > 0 && !game.gameOver ? (
							<div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-3">
								<div className="w-full max-w-2xl border-2 border-[#5c2d0e] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(74,55,35,0.25)] sm:p-5">
									<h3 className="text-center text-sm font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
										Волна {game.wave}: выбери улучшение
									</h3>
									<p className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
										Одна из трёх карточек усилит башни до конца игры
									</p>

									<div className="mt-4 grid gap-2 sm:grid-cols-3">
										{upgradeCards.map((card) => (
											<button
												key={card.id}
												type="button"
												onClick={() => pickUpgrade(card)}
												className="group flex min-h-[120px] flex-col gap-2 border-2 border-[#4a3728] bg-gradient-to-b from-[#2a1d0a] to-[#171109] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:from-[#3a2a12] active:translate-y-0"
											>
												<span className="w-fit border border-[#5c2d0e] bg-[#0f0a05]/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400">
													{TOWER_TYPES[card.type].name}
												</span>
												<span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-100">
													{card.name}
												</span>
												<span className="mt-auto text-[10px] font-bold text-[#b5a17b]">
													{card.description}
												</span>
											</button>
										))}
									</div>
								</div>
							</div>
						) : null}
						{game.selectedBuiltTower ? (
							<div className="absolute top-4 right-4 z-50 max-w-[240px]">
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

					<aside className="mx-2 my-2 flex max-h-[45dvh] shrink-0 flex-col overflow-y-auto rounded-lg border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1510] to-[#0f0c08] shadow-[0_0_20px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] p-4 sm:p-5 lg:mx-3 lg:my-3 lg:max-h-[calc(100%_-_1.5rem)] lg:w-[340px]">
						{/* Заголовок панели */}
						<div className="mb-6 px-2 py-3 border-b-2 border-[#4a3728]/50 text-center">
							<h2 className="text-xl font-black uppercase tracking-[0.15em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
								Волна <span className="text-amber-500">{game.wave}</span>
							</h2>
							<p className="mt-2 text-xs text-[#a89060] tracking-wide font-bold">{game.status}</p>
						</div>

						<div
							role="tablist"
							aria-label="Панель игры"
							className="mb-6 flex rounded-none border-2 border-[#3a2a1a] overflow-hidden bg-[#0f0a05]/50"
						>
							<button
								id="controls-tab"
								type="button"
								role="tab"
								aria-selected={activeTab === 'controls'}
								aria-controls="controls-panel"
								onClick={() => setActiveTab('controls')}
								className={tabClass('controls')}
							>
								Управление
							</button>
							<button
								id="scores-tab"
								type="button"
								role="tab"
								aria-selected={activeTab === 'scores'}
								aria-controls="scores-panel"
								onClick={() => setActiveTab('scores')}
								className={tabClass('scores')}
							>
								Топ игроков
							</button>
						</div>

						{activeTab === 'controls' ? (
							<section
								id="controls-panel"
								role="tabpanel"
								aria-labelledby="controls-tab"
								className="space-y-4"
							>
								{/* Ресурсы */}
								<div className="flex gap-3">
									<div className="flex flex-1 min-h-[82px] flex-col items-center justify-center rounded-none border-2 border-[#4a3728]/60 bg-gradient-to-b from-[#2a1d0a] to-[#1a1208] px-4 py-4 shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]">
										<span className="text-xl text-amber-400 drop-shadow-[0_1px_0_#5c2d0e] mb-1">◆</span>
										<span className="text-xl font-black text-amber-300 tracking-wider drop-shadow-[0_1px_0_#5c2d0e]">{game.gold}</span>
										<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a7340]">Золото</span>
									</div>
									<div className="flex flex-1 min-h-[82px] flex-col items-center justify-center rounded-none border-2 border-[#3a2a1a]/60 bg-gradient-to-b from-[#2a1d0a] to-[#1a1208] px-4 py-4 shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]">
										<span className="text-xl text-red-400 drop-shadow-[0_1px_0_#5c1d0e] mb-1">♥</span>
										<span className="text-xl font-black text-amber-300 tracking-wider drop-shadow-[0_1px_0_#5c2d0e]">{game.lives}</span>
										<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a7340]">Жизни</span>
									</div>
							</div>

								{/* Карточки башен */}

								<div className="grid grid-cols-1 gap-2">
									{towers.map((tower) => {
										const selected = game.selectedTower === tower.id

										return (
											<button
												key={tower.id}
												type="button"
												onClick={() => selectTower(tower.id)}
												aria-pressed={selected}
												className={`group relative flex w-full items-center gap-3 border-2 p-2.5 text-left transition-all duration-100 ${selected
														? 'border-amber-300 bg-[#302315] shadow-[0_0_12px_rgba(212,160,60,0.2)]'
														: 'border-[#3a2a18] bg-[#171109] hover:border-amber-700/70 hover:bg-[#21180d]'
													}`}
											>
												{/* Изображение башни */}
												<span
													className={`flex h-16 w-16 shrink-0 items-center justify-center border ${selected
															? 'border-amber-500/40 bg-[#45321c]'
															: 'border-[#3a2a18] bg-[#0f0b06]'
														}`}
												>
													<Image
														src={tower.image}
														width={60}
														height={60}
														alt=""
														className="h-full w-full object-contain"
													/>
												</span>

												{/* Название и характеристики */}
												<span className="flex min-w-0 flex-1 flex-col gap-2">
													<span
														className={`truncate text-xs font-black uppercase tracking-wider ${selected ? 'text-amber-200' : 'text-amber-100'
															}`}
													>
														{tower.name}
													</span>

													<span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-[#b5a17b]">
														<span className="whitespace-nowrap">
															<span className="text-[#756044]">УРОН</span>{' '}
															<span className="text-amber-100">{tower.damage}</span>
														</span>

														<span className="whitespace-nowrap">
															<span className="text-[#756044]">РАДИУС</span>{' '}
															<span className="text-amber-100">{tower.range}</span>
														</span>

														<span className="whitespace-nowrap">
															<span className="text-[#756044]">DPS</span>{' '}
															<span className="text-amber-100">{tower.dps}</span>
														</span>
													</span>
												</span>

												{/* Стоимость */}
												<span className="flex shrink-0 flex-col items-center gap-1">
													<span className="text-[9px] font-bold tracking-widest text-[#8a7340]">
														ЦЕНА
													</span>
													<span
														className={`flex h-8 min-w-12 items-center justify-center border px-2 text-sm font-black tabular-nums ${selected
																? 'border-amber-400/60 bg-[#624018] text-amber-200'
																: 'border-[#4a3728] bg-[#2b1b0c] text-amber-300'
															}`}
													>
														{tower.cost}
													</span>
												</span>
											</button>
										)
									})}
								</div>


								{/* Кнопка волны */}
								<button
									type="button"
									onClick={game.gameOver ? restartGame : startWave}
									disabled={waveButtonDisabled}
									className="min-h-[48px] w-full rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#f5e6c8] shadow-[0_4px_0_#3a1d0a,0_0_10px_rgba(212,160,60,0.3)] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] hover:shadow-[0_4px_0_#3a1d0a,0_0_16px_rgba(212,160,60,0.5)] active:translate-y-[2px] active:shadow-[0_2px_0_#3a1d0a] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
								>
									{waveButtonLabel}
								</button>

								{game.gameOver ? (
									<p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a7340] leading-relaxed">
										Результат сохранён в таблице рекордов. Клавиша <kbd className="font-black text-amber-400 border border-[#5c2d0e] px-1 rounded-none bg-[#2a1d0a]/40">R</kbd> тоже начинает новую игру.
									</p>
								) : null}
							</section>
						) : (
							<section id="scores-panel" role="tabpanel" aria-labelledby="scores-tab" className="space-y-3">
								<h2 className="mb-4 text-center text-sm font-black uppercase tracking-[0.2em] text-amber-200 drop-shadow-[0_2px_0_#5c2d0e]">
									Таблица рекордов
								</h2>
								<div className="space-y-2">
									{Array.from({ length: MAX_SCORES }, (_, index) => {
										const score = scores[index]
										return (
											<div
												key={score?.id ?? index}
												className="flex h-[56px] items-center gap-3 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-r from-[#1a1208]/80 to-[#0f0a05]/90 px-3 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]"
											>
												<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-[#5c2d0e] bg-gradient-to-b from-[#4a3728] to-[#2a1d0a] text-[10px] font-black text-amber-200">
													{index + 1}
												</span>
												<div className="min-w-0 flex-1">
													{score ? (
														<>
														<p className="truncate text-[11px] font-black text-amber-100 tracking-wide">
															{score.login ? score.login : 'Герой'}
														</p>
														<p className="truncate text-[10px] font-bold text-[#8a7340] tracking-wider">
															Волна {score.wave} · {score.gold} очков
														</p>
													</>
													) : (
														<>
															<div className="h-2 w-2/3 rounded-none bg-[#2a1d0a]/60" />
															<div className="mt-1.5 h-2 w-1/3 rounded-none bg-[#2a1d0a]/60" />
														</>
													)}
												</div>
												<span className="text-xs font-black text-amber-400 tracking-wider">
													{score ? score.gold : '—'}
												</span>
											</div>
										)
									})}
								</div>
								<p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#5c3a1a] leading-relaxed">
									Рекорды сохраняются только в этом браузере.
								</p>
							</section>
						)}
					</aside>
				</div>
			</main>
		)
	)
}
