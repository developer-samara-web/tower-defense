import Phaser from 'phaser'

import {
	createGameState,
	resetGameState,
	type GameState,
} from '@/features/game/domain/game-state'
import { cellKey, isBoardPosition, towerFootprintCells } from '@/features/game/domain/game-rules'
import {
	isTowerType,
	readSessionEnemies,
	readSessionQueuedBuild,
	readSessionTower,
	restoreBuffs,
	restoreProgress,
	restoreStats,
	type SessionPayload,
} from '@/features/game/domain/session-state'
import {
	applyUpgradeCard,
	upgradeCardTitle,
} from '@/features/game/domain/upgrade-cards'

import { drawBoard } from '../board/board-renderer'
import { loadPackTextures } from '../board/pack-textures'
import {
	createTowerView,
	TOWER_SPRITE_LEVELS,
	TOWER_TYPES_LIST,
} from '../rendering/tower-view'
import type { GameContext } from '../game-context'
import {
	MAX_TOWER_LEVEL,
	resetBoardSize,
	setBoardSize,
} from '../../config/game.config'
import {
	boardPixelHeight,
	boardPixelWidth,
	createGameMap,
	mapSeedToNumber,
	type GameMap,
	type MapCastle,
} from '../map/game-map'
import {
	castleCenterPoint,
	createCustomGameMap,
	draftSize,
	type MapDraft,
} from '../map/custom-map'
import { createEnemySystem, type EnemySystem } from '../systems/enemy-system'
import { createTowerSystem, type TowerSystem } from '../systems/tower-system'
import { createWaveSystem, type WaveSystem } from '../systems/wave-system'
import { connectBrowserControls } from '../ui/browser-controls'
import {
	bindCameraControls,
	minCameraZoom,
	type CameraController,
} from '../ui/camera-controls'
import { createHudBridge, type HudBridge } from '../ui/hud-bridge'
import { bindSceneControls } from '../ui/scene-controls'

type SessionWindow = Window & { __sessionData?: SessionPayload }

// React запоминает выбранное ускорение здесь, чтобы новая сцена стартовала
// с той же скорости, а не с обычной.
type SpeedWindow = Window & { __tdGameSpeed?: number }

// Сцена только собирает системы вместе и связывает их с вводом игрока.
export class MainScene extends Phaser.Scene {
	// Единое изменяемое состояние игры.
	private state!: GameState

	// Мост, который отправляет состояние в React-панель.
	private hud!: HudBridge

	// Контекст, который получают все системы.
	private context!: GameContext

	private enemies!: EnemySystem
	private towers!: TowerSystem
	private waves!: WaveSystem
	private cameraControls!: CameraController

	// Seed определяет дороги, поэтому карта восстанавливается вместе с игрой.
	private readonly mapSeed: string

	// Пользовательская карта из редактора: заменяет генерацию по сиду.
	private readonly customDraft: MapDraft | null

	// Сколько волн отбить до победы: 0 — без лимита, как в обычной игре.
	private readonly waveLimit: number

	// Карта игры: нужна для перезапуска с тем же замком и дорогами.
	private map!: GameMap

	// Пауза может прийти до первого кадра, когда сцена ещё не активна.
	private pauseRequested = false

	// Пока игрок тянет рамку выделения, камера не должна уезжать от курсора.
	private selectionBoxOpen = false

	// Множитель игрового времени: 1 — обычная скорость, больше — ускорение.
	private timeScale = 1

	constructor(
		mapSeed = 'default',
		customDraft: MapDraft | null = null,
		waveLimit = 0,
	) {
		super('MainScene')
		this.mapSeed = mapSeed
		this.customDraft = customDraft
		this.waveLimit = waveLimit
	}

	preload() {
		// Башни на поле выглядят по-своему на каждом уровне прокачки;
		// плоские иконки earth/fire/ice.png остались только в панели строительства.
		for (const type of TOWER_TYPES_LIST) {
			for (
				let level = 1;
				level <= Math.min(MAX_TOWER_LEVEL, TOWER_SPRITE_LEVELS);
				level++
			) {
				this.load.image(
					`tower-${type}-${level}`,
					`/game/towers/${type}-${level}.png`,
				)
			}
		}
		this.load.image('castle', '/game/buildings/castle.png')
		this.load.image('barracks', '/game/buildings/barracks.png')
		this.load.image('logo', '/ui/logo.png')

		this.load.image('enemy-small', '/game/enemies/small.png')
		this.load.image('enemy-average', '/game/enemies/average.png')
		this.load.image('enemy-big', '/game/enemies/big.png')
		this.load.image('enemy-boss', '/game/enemies/boss.png')

		this.load.image('gate-bottom', '/game/buildings/gate-bottom.png')
		this.load.image('gate-left', '/game/buildings/gate-left.png')
		this.load.image('gate-right', '/game/buildings/gate-right.png')
		this.load.image('gate-top', '/game/buildings/gate-top.png')

		// Старая кромка дороги и её декор. Дорогам теперь служит пак, но
		// пучки травы и галька нужны векторному берегу рек, а кромка —
		// отключённому режиму ROAD_EDGE_DECOR.
		this.load.image('road-edge', '/game/roads/edge.png')
		this.load.image('road-grass-fringe-1', '/game/roads/fringe-1.png')
		this.load.image('road-grass-fringe-2', '/game/roads/fringe-2.png')
		this.load.image('road-grass-fringe-3', '/game/roads/fringe-3.png')
		this.load.image('road-grass-fringe-4', '/game/roads/fringe-4.png')
		this.load.image('road-pebbles-1', '/game/roads/pebbles-1.png')
		this.load.image('road-pebbles-2', '/game/roads/pebbles-2.png')
		this.load.image('road-pebbles-3', '/game/roads/pebbles-3.png')

		// Берег рек: сухой песок с камешками и его мокрый вариант у кромки воды.
		this.load.image('river-bank', '/game/rivers/bank.png')
		this.load.image('river-bank-wet', '/game/rivers/bank-wet.png')

		// Лес собран в атлас: одна текстура и рамки деревьев из JSON.
		this.load.image('forest-atlas', '/game/forest/atlas.png')
		this.load.json('forest-frames', '/game/forest/atlas.json')

		// Квадратные текстуры поля: трава, вода и исходное полотно дороги.
		// Пак подменяет их своими коврами, если загружен.
		this.load.image('grass', '/game/terrain/grass.png')
		this.load.image('river', '/game/terrain/river.png')
		this.load.image('path', '/game/terrain/road.png')

		// Пак земли и пропов: из него собираются ковры поля и полотна
		// дорог, им же декорируется свободная земля.
		loadPackTextures(this.load)
	}

	// Вызывается Phaser при создании сцены.
	create() {
		// Движок рисует поле по глобальным COLS/ROWS, поэтому размер
		// текущей карты выставляем до первого обращения к карте.
		if (this.customDraft) {
			const size = draftSize(this.customDraft)
			setBoardSize(size.cols, size.rows)
		} else {
			resetBoardSize()
		}

		// Готовим карту и состояние. Прочность замка в пользовательской
		// карте задаётся игроком, поэтому жизни берём из неё.
		const map = this.customDraft
			? createCustomGameMap(this.customDraft)
			: createGameMap(this.mapSeed)
		this.map = map
		this.state = createGameState(map.castle.hp, this.waveLimit)

		// Фон за пределами поля рисует CSS-слой с картинкой леса,
		// поэтому камера остаётся прозрачной.
		this.setupCamera(map.castle)
		this.cameraControls = bindCameraControls(this, castleCenterPoint(map.castle), {
			// Левая кнопка мыши рисует рамку выделения, поэтому камеру ею не
			// двигаем: прокрутка остаётся на правой и средней кнопках.
			// Палец — исключение: свайп по-прежнему катает карту.
			shouldDrag: (pointer) =>
				pointer.wasTouch ||
				pointer.rightButtonDown() ||
				pointer.middleButtonDown(),
			blockEdgePan: () => this.selectionBoxOpen,
			// W в бою выбирает башню, поэтому вертикаль остаётся на стрелках.
			wasdPan: false,
		})

		this.state.pathCells = drawBoard(
			this,
			map,
			mapSeedToNumber(this.mapSeed),
		)
		this.state.waterCells = new Set(map.waterCells)

		// Создаём мост состояния и общий контекст для систем.
		this.hud = createHudBridge(this.state, this)
		this.context = {
			scene: this,
			state: this.state,
			map,
			setStatus: (status) => {
				this.state.status = status
			},
			publish: () => this.hud.publish(),
		}

		// Создаём системы в порядке зависимостей.
		this.enemies = createEnemySystem(this.context, {
			onGameOver: () => this.handleGameOver(),
		})
		this.towers = createTowerSystem(this.context, this.enemies)
		this.waves = createWaveSystem(this.context, {
			onWaveComplete: () => this.enemies.clearBlood(),
		})

		// Загружаем сохранённую сессию, если она была передана из React.
		// Пользовательская карта всегда начинается заново: её сохранения
		// не относятся к сиду и не должны подмешиваться.
		if (!this.customDraft) this.restoreSession()

		// Подключаем управление с клавиатуры, мыши и из React-панели.
		this.bindControls()
		this.connectPanel()
		this.bindPauseControls()

		// Игрок мог включить ускорение ещё до пересоздания сцены.
		this.setSpeed((window as SpeedWindow).__tdGameSpeed ?? 1)

		// Отправляем первоначальное состояние в интерфейс.
		this.hud.publish()

		// Убираем обработчики при завершении сцены.
		this.events.once('shutdown', () => {
			this.cameraControls.destroy()
		})
	}

	// Восстанавливает сохранённую игру поверх свежей сцены.
	private restoreSession() {
		if (typeof window === 'undefined') return

		const sessionWindow = window as SessionWindow
		const payload = sessionWindow.__sessionData
		if (!payload?.gameState) return

		const saved = payload.gameState
		const { state } = this

		state.wave = nonNegativeInt(saved.wave, 0)
		state.gold = nonNegativeNumber(saved.gold, state.gold)
		state.lives = nonNegativeNumber(saved.lives, state.lives)
		state.waveActive = saved.waveActive === true
		state.waveBreakRemaining = nonNegativeNumber(
			saved.waveBreakRemaining,
			nonNegativeNumber(saved.nextWaveIn, 0) * 1000,
		)
		state.spawnRemaining = nonNegativeInt(saved.spawnRemaining, 0)
		state.spawnedInWave = nonNegativeInt(saved.spawnedInWave, 0)
		state.spawnCooldown = nonNegativeNumber(saved.spawnCooldown, 0)
		state.selectedTower = isTowerType(saved.selectedTower)
			? saved.selectedTower
			: null
		// Выделение башен из снимка не восстанавливается: DTO не содержит
		// объектов Phaser, поэтому выбор возвращается только кликом.
		state.selectedTowers.length = 0
		state.status = typeof saved.status === 'string' ? saved.status : ''
		state.buffs = restoreBuffs(saved.buffs)
		state.stats = restoreStats(saved.stats ?? payload.stats)
		state.resultReported = saved.resultReported === true

		const progress = restoreProgress(saved)
		state.level = progress.level
		state.xp = progress.xp
		state.pendingUpgrades = progress.pendingUpgrades

		// Башни восстанавливаем вручную, чтобы не списывать золото повторно.
		for (const entry of saved.towers ?? []) {
			const tower = readSessionTower(entry)
			if (!tower) continue

			const [cellX, cellY] = tower.id.split(',').map(Number)
			const position = { x: cellX, y: cellY }
			if (!isBoardPosition(position)) continue
			// Площадка 2×2: если её часть уже занята, башню не восстанавливаем.
			if (towerFootprintCells(position).some((cell) => state.towerCells.has(cell))) continue

			const view = createTowerView(this, tower.type, cellX, cellY, tower.level)
			state.towers.push({
				id: tower.id,
				type: tower.type,
				level: tower.level,
				invested: tower.invested,
				autoUpgrade: tower.autoUpgrade === true,
				x: view.x,
				y: view.y,
				cooldown: 0,
				body: view.body,
				rank: view.rank,
			})
			for (const cell of towerFootprintCells(position)) state.towerCells.add(cell)
		}

		// Врагов возвращаем на те же места, чтобы волна не завершилась мгновенно.
		this.enemies.restore(readSessionEnemies(saved.enemies))

		// Заявки очереди стройки возвращаем после башен: площадка могла
		// освободиться, а построенная башня — занять клетку из сохранения.
		state.buildQueue.length = 0
		for (const entry of saved.buildQueue ?? []) {
			const item = readSessionQueuedBuild(entry)
			if (!item) continue

			const position = { x: item.x, y: item.y }
			if (!isBoardPosition(position)) continue
			if (towerFootprintCells(position).some((cell) => state.towerCells.has(cell))) continue

			state.buildQueue.push({ ...item, id: cellKey(position) })
		}
		this.towers.refreshQueue()

		delete sessionWindow.__sessionData
	}

	// Готовит камеру к путешествию по большому миру.
	private setupCamera(castle: MapCastle) {
		const camera = this.cameras.main

		camera.setBackgroundColor('rgba(74,127,42,1)')

		// Границы строго по игровому полю.
		camera.setBounds(
			0,
			0,
			boardPixelWidth(),
			boardPixelHeight(),
		)

		// Стартуем с зума, при котором поле заполняет окно целиком:
		// иначе на широких экранах по краям видна пустота за границей поля.
		camera.setZoom(minCameraZoom(camera))
		const center = castleCenterPoint(castle)
		camera.centerOn(center.x, center.y)
	}

	// Основной игровой цикл Phaser. Вызывается каждый кадр.
	update(_time: number, delta: number) {
		if (this.pauseRequested) {
			this.pauseRequested = false
			this.scene.pause()
			return
		}

		// Камера живёт в реальном времени: ускорение касается только боя.
		this.cameraControls.update(delta)

		const gameDelta = delta * this.timeScale
		this.waves.update(gameDelta)
		this.enemies.updateSpawning(gameDelta)
		this.enemies.update(gameDelta)
		this.towers.update(gameDelta)
		this.waves.checkComplete()
		this.hud.publish()
	}

	// Подключает мышь и клавиатуру Phaser.
	private bindControls() {
		bindSceneControls(this, {
			onPointerDown: (worldX, worldY, additive) =>
				this.towers.place(worldX, worldY, additive),
			onRightClick: (worldX, worldY) => this.towers.queueAt(worldX, worldY),
			onPointerMove: (worldX, worldY) => this.towers.hover(worldX, worldY),
			onPointerLeave: () => this.towers.clearHover(),
			onSelectionBox: (box) => {
				this.selectionBoxOpen = box !== null
				this.towers.showSelectionBox(box)
			},
			onSelectionCommit: (box, additive) => {
				this.selectionBoxOpen = false
				this.towers.selectInBox(box, additive)
			},
			onStartWave: () => this.waves.requestStart(),
			onSelectType: (type) => this.towers.selectType(type),
			onUpgrade: () => this.towers.upgrade(),
			onRestart: () => {
				if (this.state.lives <= 0) this.restartGame()
			},
		})
	}

	// Подключает кнопки React-панели.
	private connectPanel() {
		connectBrowserControls(this, {
			onSelectType: (type) => this.towers.selectType(type),
			onStartWave: () => this.waves.requestStart(),
			onUpgrade: () => this.towers.upgrade(),
			onToggleAutoUpgrade: () => this.towers.toggleAutoUpgrade(),
			onSetSpeed: (scale) => this.setSpeed(scale),
			onSell: () => this.towers.sell(),
			onDeselect: () => {
				this.towers.deselect()
				this.hud.publish()
			},
			onRestart: () => this.restartGame(),
			onPickUpgrade: (card) => {
				// Постоянно усиливаем выбранный тип башни.
				this.state.buffs = applyUpgradeCard(this.state.buffs, card)
				this.state.pendingUpgrades = Math.max(
					0,
					this.state.pendingUpgrades - 1,
				)
				// Карточка могла сдвинуть радиус: зоны выбранных башен
				// перерисовываем сразу — сцена стоит на паузе и кадров не ждёт.
				this.towers.refreshSelectionVisuals()
				this.context.setStatus(`${upgradeCardTitle(card)} — ${card.description}.`)
				// Форсируем отправку: сцена на паузе, а React ждёт снимок сразу.
				this.hud.publish(true)
			},
			onRerollUpgrades: (cost) => {
				// Деньги списываем здесь, а новые карты React генерирует сам.
				// Выбор открыт и бой на паузе, так что запас золота за этот
				// клик измениться не мог.
				if (cost > this.state.gold) {
					this.context.setStatus('Не хватает золота на обновление улучшений.')
					this.hud.publish(true)
					return
				}

				this.state.gold -= cost
				this.state.stats.moneySpent += cost
				this.context.setStatus(`Новые улучшения за ${cost} золота.`)
				this.hud.publish(true)
			},
		})
	}

	// Множитель времени из React-панели. Ускоряем и снаряды со вспышками,
	// иначе на ×3 враги бегут быстрее, чем летит в них пуля.
	private setSpeed(scale: number) {
		this.timeScale = scale
		this.tweens.timeScale = scale
	}

	// React ставит игру на паузу, пока открыто меню, профиль или выбор улучшения.
	private bindPauseControls() {
		const pauseScene = () => {
			this.pauseRequested = true
			// После destroy() у ScenePlugin нет manager — событие прилетает
			// от ещё не снятого слушателя, на паузу ставить уже нечего.
			if (!this.scene.manager) return
			if (this.scene.isActive()) this.scene.pause()
		}
		const resumeScene = () => {
			this.pauseRequested = false
			if (!this.scene.manager) return
			if (this.scene.isPaused()) this.scene.resume()
		}

		window.addEventListener('td:pause', pauseScene)
		window.addEventListener('td:resume', resumeScene)

		// При уничтожении игры SceneManager вызывает sys.destroy() без
		// события shutdown, поэтому чистим слушатели на обоих событиях.
		const cleanup = () => {
			window.removeEventListener('td:pause', pauseScene)
			window.removeEventListener('td:resume', resumeScene)
		}
		this.events.once('shutdown', cleanup)
		this.events.once('destroy', cleanup)
	}

	// Возвращает игру в начальное состояние, не пересоздавая сцену.
	private restartGame() {
		this.enemies.clear()
		this.towers.clear()
		resetGameState(this.state, this.map.castle.hp)
		this.cameraControls.reset()
		this.hud.reset()
		this.hud.publish(true)
		// Новая игра всегда начинается с активной сцены.
		window.dispatchEvent(new Event('td:resume'))
	}

	// Завершает игру, когда у игрока закончились жизни.
	private handleGameOver() {
		const { state } = this

		// Прекращаем появление врагов и останавливаем волну.
		state.spawnRemaining = 0
		state.waveActive = false
		state.waveBreakRemaining = 0

		this.context.setStatus(
			`Игра окончена. Ты продержался до волны ${state.wave}.`,
		)

		// Отправляем событие завершения игры только один раз.
		if (state.resultReported) return
		state.resultReported = true

		window.dispatchEvent(
			new CustomEvent('td:game-over', {
				detail: { wave: state.wave, gold: state.gold },
			}),
		)

		this.hud.publish()
	}
}

function nonNegativeNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: fallback
}

function nonNegativeInt(value: unknown, fallback: number) {
	return Math.trunc(nonNegativeNumber(value, fallback))
}
