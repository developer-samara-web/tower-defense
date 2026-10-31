import {
	CUSTOM_ENEMY_SPAWN_INTERVAL,
	ENEMY_TYPES,
	WAVE_REWARD_GROWTH,
	type EnemyType,
} from '../config/game.config.ts'
import {
	enemyGroupSize,
	enemySpawnInterval,
	enemyStats,
	waveCompletionReward,
	waveEnemyCount,
	xpForKill,
} from '../domain/game-rules.ts'
import type { MapDraft } from './map/custom-map.ts'
import { waveModifiers, waveSpawnUnits } from './map/custom-waves.ts'

// Строка одного вида монстров в сводке волны.
export type WaveEnemyRow = {
	type: EnemyType
	name: string
	color: string
	count: number
	hp: number
	speed: number
	reward: number
	xp: number
	// Сколько прочности замка теряет игрок, когда монстр прорывается.
	damage: number
}

export type WavePreview = {
	wave: number
	// true — карта из редактора: состав задают казармы, а не общая прогрессия.
	custom: boolean
	total: number
	reward: number
	// Группового спавна на пользовательских картах нет — там ровный поток.
	groupSize: number
	spawnInterval: number
	rows: WaveEnemyRow[]
}

function colorOf(color: number) {
	return `#${color.toString(16).padStart(6, '0')}`
}

// Сводка по волне для панели «Информация»: сколько монстров придёт,
// какими характеристиками они обладают и что игрок получит за волну.
// Расчёт повторяет логику спавна, поэтому цифры совпадают с боем.
export function wavePreview(
	draft: MapDraft | null | undefined,
	wave: number,
): WavePreview {
	const safeWave = Math.max(1, Math.trunc(wave))
	const level = Math.max(0, safeWave - 1)
	const rows = new Map<EnemyType, WaveEnemyRow>()
	const custom = Boolean(draft && draft.spawners.length > 0)

	if (draft && custom) {
		for (const unit of waveSpawnUnits(draft, safeWave)) {
			const base = ENEMY_TYPES[unit.troop.type]
			const modifiers = waveModifiers(
				draft.waves,
				safeWave,
				draft.spawners[unit.spawnerIndex]?.growth,
			)
			const row: WaveEnemyRow = {
				type: unit.troop.type,
				name: base.name,
				color: colorOf(base.color),
				count: 1,
				hp: Math.max(1, Math.round(unit.troop.health * modifiers.health)),
				speed: Math.max(1, Math.round(unit.troop.speed * modifiers.speed)),
				reward: Math.round(base.reward * (1 + level * WAVE_REWARD_GROWTH)),
				xp: xpForKill(unit.troop.type, safeWave),
				damage: Math.max(1, Math.round(unit.troop.strength)),
			}
			mergeRow(rows, row)
		}
	} else {
		const total = waveEnemyCount(safeWave)

		for (let index = 0; index < total; index++) {
			const stats = enemyStats(safeWave, index)
			const base = ENEMY_TYPES[stats.type]
			mergeRow(rows, {
				type: stats.type,
				name: base.name,
				color: colorOf(base.color),
				count: 1,
				hp: stats.hp,
				speed: stats.speed,
				reward: stats.reward,
				xp: stats.xp,
				damage: 1,
			})
		}
	}

	const ordered = (Object.keys(ENEMY_TYPES) as EnemyType[])
		.map((type) => rows.get(type))
		.filter((row): row is WaveEnemyRow => Boolean(row))

	return {
		wave: safeWave,
		custom,
		total: ordered.reduce((sum, row) => sum + row.count, 0),
		reward: waveCompletionReward(safeWave),
		groupSize: custom ? 0 : enemyGroupSize(safeWave),
		spawnInterval: custom ? CUSTOM_ENEMY_SPAWN_INTERVAL : enemySpawnInterval(safeWave),
		rows: ordered,
	}
}

// Один вид мог быть в нескольких казармах с разными настройками:
// показываем худший вариант и суммируем количество.
function mergeRow(rows: Map<EnemyType, WaveEnemyRow>, row: WaveEnemyRow) {
	const existing = rows.get(row.type)

	if (!existing) {
		rows.set(row.type, row)
		return
	}

	existing.count += row.count
	existing.hp = Math.max(existing.hp, row.hp)
	existing.speed = Math.max(existing.speed, row.speed)
	existing.damage = Math.max(existing.damage, row.damage)
}
