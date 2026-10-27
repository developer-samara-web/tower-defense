import {
	ENEMY_TYPES,
	MAX_PENDING_UPGRADES,
	MAX_TOWER_LEVEL,
	TOWER_TYPES,
	type EnemyType,
	type TowerType,
} from '../config/game.config.ts'
import type { GameSnapshot, GameStats } from './game-state.ts'
import { createEmptyBuffs, type TowerBuffs } from './game-rules.ts'

export type SessionTower = {
	id: string
	type: TowerType
	level: number
	invested: number
}

export type SessionEnemy = {
	type: EnemyType
	x: number
	y: number
	hp: number
	maxHp: number
	speed: number
	reward: number
	xp: number
	pathIndex: number
	routeIndex: number
	slowTimer: number
}

// Только те поля, которые нужны для продолжения игры.
// Карта восстанавливается по mapSeed, а враги и снаряды — заново.
export type SessionGameState = {
	wave: number
	gold: number
	lives: number
	waveActive: boolean
	waveBreakRemaining: number
	spawnRemaining: number
	spawnedInWave: number
	spawnCooldown: number
	selectedTower: TowerType | null
	status: string
	buffs: TowerBuffs
	stats: GameStats
	resultReported: boolean
	towers: SessionTower[]
	enemies: SessionEnemy[]
	level: number
	xp: number
	pendingUpgrades: number
}

// Старые сохранения могли содержать DTO выбранной башни и nextWaveIn.
export type StoredSessionGameState = Partial<SessionGameState> & {
	nextWaveIn?: number
	selectedBuiltTower?: unknown
}

export type SessionPayload = {
	sessionId?: string
	mapSeed?: string
	gameState?: StoredSessionGameState
	stats?: GameStats
	error?: string
}

export function toSessionGameState(snapshot: GameSnapshot): SessionGameState {
	return {
		wave: snapshot.wave,
		gold: snapshot.gold,
		lives: snapshot.lives,
		waveActive: snapshot.waveActive,
		waveBreakRemaining: snapshot.waveBreakRemaining,
		spawnRemaining: snapshot.spawnRemaining,
		spawnedInWave: snapshot.spawnedInWave,
		spawnCooldown: snapshot.spawnCooldown,
		selectedTower: snapshot.selectedTower,
		status: snapshot.status,
		buffs: snapshot.buffs,
		stats: snapshot.stats,
		resultReported: snapshot.resultReported,
		towers: snapshot.towers.map(({ id, type, level, invested }) => ({
			id,
			type,
			level,
			invested,
		})),
		enemies: snapshot.enemyStates.map((enemy) => ({ ...enemy })),
		level: snapshot.level,
		xp: snapshot.xp,
		pendingUpgrades: snapshot.pendingUpgrades,
	}
}

// Пустую игру сохранять не нужно: иначе новая сессия затирает старую.
export function hasSessionProgress(state: {
	wave?: number
	towers?: readonly unknown[]
}) {
	return (state.wave ?? 0) > 0 || (state.towers?.length ?? 0) > 0
}

export function isTowerType(value: unknown): value is TowerType {
	return value === 'ice' || value === 'fire' || value === 'earth'
}

export function isEnemyType(value: unknown): value is EnemyType {
	return value === 'scout' || value === 'brute' || value === 'sprinter' || value === 'boss'
}

export function readSessionEnemy(raw: unknown): SessionEnemy | null {
	if (!raw || typeof raw !== 'object') return null

	const enemy = raw as Record<string, unknown>
	if (!isEnemyType(enemy.type)) return null

	const x = finiteOrNull(enemy.x)
	const y = finiteOrNull(enemy.y)
	const hp = positiveOrNull(enemy.hp)
	const maxHp = positiveOrNull(enemy.maxHp)
	const speed = positiveOrNull(enemy.speed)
	const reward = nonNegativeOrNull(enemy.reward)
	const pathIndex = nonNegativeIntOrNull(enemy.pathIndex)
	const routeIndex = nonNegativeIntOrNull(enemy.routeIndex)

	if (
		x === null || y === null || hp === null || maxHp === null ||
		speed === null || reward === null || pathIndex === null || routeIndex === null
	) {
		return null
	}

	return {
		type: enemy.type,
		x,
		y,
		hp: Math.min(hp, maxHp),
		maxHp,
		speed,
		reward,
		xp: Math.trunc(nonNegative(enemy.xp, ENEMY_TYPES[enemy.type].xp)),
		pathIndex,
		routeIndex,
		slowTimer: nonNegative(enemy.slowTimer, 0),
	}
}

export function readSessionTower(raw: unknown): SessionTower | null {
	if (!raw || typeof raw !== 'object') return null

	const tower = raw as Record<string, unknown>
	if (typeof tower.id !== 'string' || !isTowerType(tower.type)) return null

	return {
		id: tower.id,
		type: tower.type,
		level: clampInt(tower.level, 1, MAX_TOWER_LEVEL),
		invested: nonNegative(tower.invested, TOWER_TYPES[tower.type].cost),
	}
}

export function readSessionEnemies(raw: unknown): SessionEnemy[] {
	if (!Array.isArray(raw)) return []
	return raw
		.map(readSessionEnemy)
		.filter((enemy): enemy is SessionEnemy => enemy !== null)
}

export function restoreBuffs(raw: unknown): TowerBuffs {
	const buffs = createEmptyBuffs()
	if (!raw || typeof raw !== 'object') return buffs

	const source = raw as Record<string, unknown>
	for (const type of Object.keys(buffs) as TowerType[]) {
		const value = source[type]
		if (!value || typeof value !== 'object') continue

		const buff = value as Record<string, unknown>
		buffs[type] = {
			damage: positive(buff.damage, 1),
			range: positive(buff.range, 1),
			speed: positive(buff.speed, 1),
		}
	}

	return buffs
}

export function restoreStats(raw: unknown): GameStats {
	const stats = raw && typeof raw === 'object'
		? (raw as Record<string, unknown>)
		: {}

	return {
		monstersKilled: nonNegative(stats.monstersKilled, 0),
		buildingsBuilt: nonNegative(stats.buildingsBuilt, 0),
		moneySpent: nonNegative(stats.moneySpent, 0),
		damageDealt: nonNegative(stats.damageDealt, 0),
	}
}

export type RestoredProgress = {
	level: number
	xp: number
	pendingUpgrades: number
}

// Старые сохранения не содержат опыта: тогда игрок начинает с первого уровня.
export function restoreProgress(raw: unknown): RestoredProgress {
	const progress = raw && typeof raw === 'object'
		? (raw as Record<string, unknown>)
		: {}

	return {
		level: Math.max(1, Math.trunc(nonNegative(progress.level, 1))),
		xp: Math.trunc(nonNegative(progress.xp, 0)),
		pendingUpgrades: Math.min(
			MAX_PENDING_UPGRADES,
			Math.trunc(nonNegative(progress.pendingUpgrades, 0)),
		),
	}
}

function positive(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? value
		: fallback
}

function nonNegative(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: fallback
}

function clampInt(value: unknown, min: number, max: number) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return min
	return Math.min(max, Math.max(min, Math.trunc(value)))
}

function finiteOrNull(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function positiveOrNull(value: unknown) {
	const number = finiteOrNull(value)
	return number !== null && number > 0 ? number : null
}

function nonNegativeOrNull(value: unknown) {
	const number = finiteOrNull(value)
	return number !== null && number >= 0 ? number : null
}

function nonNegativeIntOrNull(value: unknown) {
	const number = nonNegativeOrNull(value)
	return number === null ? null : Math.trunc(number)
}
