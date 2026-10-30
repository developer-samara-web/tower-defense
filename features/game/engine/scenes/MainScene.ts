import Phaser from 'phaser'

import {
	createGameState,
	resetGameState,
	type GameState,
} from '@/features/game/domain/game-state'
import { isBoardPosition } from '@/features/game/domain/game-rules'
import {
	isTowerType,
	readSessionEnemies,
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
import { createTowerView } from '../rendering/tower-view'
import type { GameContext } from '../game-context'
import { resetBoardSize, setBoardSize } from '../../config/game.config'
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

	// Карта игры: нужна для перезапуска с тем же замком и дорогами.
	private map!: GameMap

	// Пауза может прийти до первого кадра, когда сцена ещё не активна.
	private pauseRequested = false

	// Множитель игрового времени: 1 — обычная скорость, больше — ускорение.
	private timeScale = 1

	constructor(mapSeed = 'default', customDraft: MapDraft | null = null) {
		super('MainScene')
		this.mapSeed = mapSeed
		this.customDraft = customDraft
	}

	preload() {
		this.load.image('tower-ice', '/game/towers/ice.png')
		this.load.image('tower-fire', '/game/towers/fire.png')
		this.load.image('tower-earth', '/game/towers/earth.png')
		this.load.image('castle', '/game/path/castle.png')
		this.load.image('barracks', '/game/monsters/barracks.png')
		this.load.image('logo', '/game/logo.png')

		this.load.image('enemy-small', '/game/enemy/small.png')
		this.load.image('enemy-average', '/game/enemy/average.png')
		this.load.image('enemy-big', '/game/enemy/big.png')
		this.load.image('enemy-boss', '/game/enemy/boss.png')

		this.load.image('gate-bottom', '/game/path/gate-bottom.png')
		this.load.image('gate-left', '/game/path/gate-left.png')
		this.load.image('gate-right', '/game/path/gate-right.png')
		this.load.image('gate-top', '/game/path/gate-top.png')

		// Кромка дороги и её декор: полоса утоптанной земли, трава и камешки.
		this.load.image('road-edge', '/game/path/road-edge.png')
		this.load.image('road-grass-fringe-1', '/game/path/road-grass-fringe-1.png')
		this.load.image('road-grass-fringe-2', '/game/path/road-grass-fringe-2.png')
		this.load.image('road-grass-fringe-3', '/game/path/road-grass-fringe-3.png')
		this.load.image('road-grass-fringe-4', '/game/path/road-grass-fringe-4.png')
		this.load.image('road-pebbles-1', '/game/path/road-pebbles-1.png')
		this.load.image('road-pebbles-2', '/game/path/road-pebbles-2.png')
		this.load.image('road-pebbles-3', '/game/path/road-pebbles-3.png')

		// Берег рек: сухой песок с камешками и его мокрый вариант у кромки воды.
		this.load.image('river-bank', '/game/rivers/river-bank.png')
		this.load.image('river-bank-wet', '/game/rivers/river-bank-wet.png')

		// Лес собран в атлас: одна текстура и рамки деревьев из JSON.
		this.load.image('forest-atlas', '/game/forest/atlas.png')
		this.load.json('forest-frames', '/game/forest/atlas.json')

		// Квадратные текстуры для живой карты.
		;[
			'grass',
			'river',
			'path',
		].forEach((key) => this.load.image(key, `/game/grid/${key}.png`))
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
		this.state = createGameState(map.castle.hp)

		// Фон за пределами поля рисует CSS-слой с картинкой леса,
		// поэтому камера остаётся прозрачной.
		this.setupCamera(map.castle)
		this.cameraControls = bindCameraControls(this, castleCenterPoint(map.castle))

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
		// DTO выбранной башни из снимка не содержит Phaser-объектов,
		// поэтому выбор восстанавливается только кликом по башне.
		state.selectedBuiltTower = null
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
			if (state.towerCells.has(tower.id)) continue

			const view = createTowerView(this, tower.type, cellX, cellY)
			state.towers.push({
				id: tower.id,
				type: tower.type,
				level: tower.level,
				invested: tower.invested,
				autoUpgrade: false,
				x: view.x,
				y: view.y,
				cooldown: 0,
				body: view.body,
				icon: view.icon,
				levelText: view.levelText,
			})
			state.towerCells.add(tower.id)

			if (tower.level > 1) {
				view.levelText.setText(String(tower.level)).setVisible(true)
			}
		}

		// Врагов возвращаем на те же места, чтобы волна не завершилась мгновенно.
		this.enemies.restore(readSessionEnemies(saved.enemies))

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
			onPointerDown: (worldX, worldY) => this.towers.place(worldX, worldY),
			onPointerMove: (worldX, worldY) => this.towers.hover(worldX, worldY),
			onPointerLeave: () => this.towers.clearHover(),
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
				this.context.setStatus(`${upgradeCardTitle(card)} — ${card.description}.`)
				// Форсируем отправку: сцена на паузе, а React ждёт снимок сразу.
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
