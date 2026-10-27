import {
	INITIAL_GOLD,
	INITIAL_LIVES,
	MAX_TOWER_LEVEL,
	TOWER_TYPES,
	type TowerType,
} from '../config/game.config.ts'
import type { Enemy, Tower } from '../types/game.types.ts'
import { towerSellValue, towerStats, towerUpgradeCost, xpToNextLevel } from './game-rules.ts'
import { createEmptyBuffs, type TowerBuffs } from './game-rules.ts'
import type { SessionEnemy } from './session-state.ts'

export type GameStats = {
	monstersKilled: number
	buildingsBuilt: number
	moneySpent: number
	damageDealt: number
}

// Всё изменяемое состояние одной игры. Живёт в сцене и передаётся системам.
export type GameState = {
	gold: number
	lives: number
	wave: number
	waveActive: boolean
	waveBreakRemaining: number
	spawnRemaining: number
	spawnedInWave: number
	spawnCooldown: number
	selectedTower: TowerType | null
	selectedBuiltTower: Tower | null
	pathCells: Set<string>
	towerCells: Set<string>
	towers: Tower[]
	enemies: Enemy[]
	buffs: TowerBuffs
	resultReported: boolean
	status: string
	stats: GameStats
	// Прогресс игрока: опыт, уровень и невыбранные награды за уровни.
	level: number
	xp: number
	pendingUpgrades: number
}

export type SelectedTowerInfo = {
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

// Снимок состояния для React-панели.
export type GameSnapshot = {
	wave: number
	gold: number
	lives: number
	enemies: number
	selectedTower: TowerType | null
	selectedBuiltTower: SelectedTowerInfo | null
	// Позиция панели башни в координатах игрового полотна.
	panelPosition: { x: number; y: number } | null
	status: string
	waveActive: boolean
	nextWaveIn: number
	gameOver: boolean
	towers: Array<{
		id: string
		x: number
		y: number
		type: TowerType
		level: number
		invested: number
	}>
	// Живые враги нужны, чтобы продолжить волну с того же места.
	enemyStates: SessionEnemy[]
	towerCells: string[]
	pathCells: string[]
	viewport: {
		worldX: number
		worldY: number
		width: number
		height: number
		zoom: number
	} | null
	stats: GameStats
	buffs: TowerBuffs
	resultReported: boolean
	spawnRemaining: number
	spawnedInWave: number
	spawnCooldown: number
	waveBreakRemaining: number
	level: number
	xp: number
	xpToNextLevel: number
	pendingUpgrades: number
}

export const DEFAULT_STATUS = 'Выбери башню и подготовь оборону'

export function createGameState(): GameState {
	return {
		gold: INITIAL_GOLD,
		lives: INITIAL_LIVES,
		wave: 0,
		waveActive: false,
		waveBreakRemaining: 0,
		spawnRemaining: 0,
		spawnedInWave: 0,
		spawnCooldown: 0,
		selectedTower: null,
		selectedBuiltTower: null,
		pathCells: new Set(),
		towerCells: new Set(),
		towers: [],
		enemies: [],
		buffs: createEmptyBuffs(),
		resultReported: false,
		status: '',
		stats: {
			monstersKilled: 0,
			buildingsBuilt: 0,
			moneySpent: 0,
			damageDealt: 0,
		},
		level: 1,
		xp: 0,
		pendingUpgrades: 0,
	}
}

// Возвращает скалярные поля к началу игры. Массивы и множества
// очищают системы, потому что им нужно сначала удалить объекты Phaser.
export function resetGameState(state: GameState) {
	state.gold = INITIAL_GOLD
	state.lives = INITIAL_LIVES
	state.wave = 0
	state.waveActive = false
	state.waveBreakRemaining = 0
	state.spawnRemaining = 0
	state.spawnedInWave = 0
	state.spawnCooldown = 0
	state.selectedTower = null
	state.selectedBuiltTower = null
	state.buffs = createEmptyBuffs()
	state.resultReported = false
	state.status = ''
	state.stats.monstersKilled = 0
	state.stats.buildingsBuilt = 0
	state.stats.moneySpent = 0
	state.stats.damageDealt = 0
	state.level = 1
	state.xp = 0
	state.pendingUpgrades = 0
}

export function buildSnapshot(
	state: GameState,
	panelPosition: { x: number; y: number } | null = null,
): GameSnapshot {
	const selected = state.selectedBuiltTower
	
	return {
		wave: state.wave,
		gold: state.gold,
		lives: state.lives,
		enemies: state.enemies.length,
		selectedTower: state.selectedTower,
		selectedBuiltTower: selected ? describeTower(selected, state.buffs) : null,
		panelPosition: selected ? panelPosition : null,
		status: state.status || DEFAULT_STATUS,
		waveActive: state.waveActive,
		nextWaveIn: Math.ceil(state.waveBreakRemaining / 1000),
		gameOver: state.lives <= 0,
		towers: state.towers.map((t) => ({ id: t.id, x: t.x, y: t.y, type: t.type, level: t.level, invested: t.invested })),
		enemyStates: state.enemies.map((enemy) => ({
			type: enemy.type,
			x: enemy.x,
			y: enemy.y,
			hp: enemy.hp,
			maxHp: enemy.maxHp,
			speed: enemy.speed,
			reward: enemy.reward,
			xp: enemy.xp,
			pathIndex: enemy.pathIndex,
			routeIndex: enemy.routeIndex,
			slowTimer: enemy.slowTimer,
		})),
		towerCells: Array.from(state.towerCells),
		pathCells: Array.from(state.pathCells),
		viewport: null,
		stats: state.stats,
		buffs: state.buffs,
		resultReported: state.resultReported,
		spawnRemaining: state.spawnRemaining,
		spawnedInWave: state.spawnedInWave,
		spawnCooldown: state.spawnCooldown,
		waveBreakRemaining: state.waveBreakRemaining,
		level: state.level,
		xp: state.xp,
		xpToNextLevel: xpToNextLevel(state.level),
		pendingUpgrades: state.pendingUpgrades,
	}
}

function describeTower(tower: Tower, buffs: TowerBuffs): SelectedTowerInfo {
	const stats = towerStats(tower.type, tower.level, buffs)

	return {
		id: tower.id,
		type: tower.type,
		name: TOWER_TYPES[tower.type].name,
		level: tower.level,
		maxLevel: MAX_TOWER_LEVEL,
		damage: stats.damage,
		range: stats.range,
		attackSpeed: stats.attackSpeed,
		upgradeCost: towerUpgradeCost(tower.type, tower.level),
		sellValue: towerSellValue(tower.invested),
	}
}
