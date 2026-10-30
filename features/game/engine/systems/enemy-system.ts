import {
	CUSTOM_ENEMY_SPAWN_INTERVAL,
	ENEMY_TYPES,
	WAVE_REWARD_GROWTH,
	type EnemyType,
} from '../../config/game.config'
import {
	addExperience,
	enemyGroupSize,
	enemySpawnDelay,
	enemyStats,
	isInsideBoardPoint,
	xpForKill,
} from '../../domain/game-rules'
import type { SessionEnemy } from '../../domain/session-state'
import type { Enemy } from '../../types/game.types'
import type { GameContext } from '../game-context'
import { waveModifiers, waveSpawnUnits } from '../map/custom-waves'
import { createEnemyView, drawHealthBar } from '../rendering/enemy-view'

type EnemyHooks = {
	onGameOver: () => void
}

export type EnemySystem = {
	updateSpawning: (delta: number) => void
	update: (delta: number) => void
	damage: (enemy: Enemy, damage: number) => void
	applyBurn: (enemy: Enemy, damagePerSecond: number, duration: number) => void
	restore: (enemies: readonly SessionEnemy[]) => void
	clearBlood: () => void
	clear: () => void
}

// Защита от повреждённого/подделанного сохранения.
const MAX_RESTORED_ENEMIES = 300

// Отвечает за появление врагов, их перемещение по маршруту и урон.
export function createEnemySystem(
	ctx: GameContext,
	hooks: EnemyHooks,
): EnemySystem {
	// Маршрут текущей группы: враги внутри группы идут одной дорогой.
	let groupRouteIndex: number | null = null

	// Слой кровавых следов: лежит над дорогой, но под врагами,
	// и живёт до конца текущей волны.
	const bloodLayer = ctx.scene.add.graphics().setDepth(1.5)

	// Оставляет красный след на месте гибели врага.
	function leaveBlood(enemy: Enemy) {
		const radius = ENEMY_TYPES[enemy.type].radius
		const blobs = 4 + Math.floor(Math.random() * 4)

		for (let i = 0; i < blobs; i++) {
			const angle = Math.random() * Math.PI * 2
			const distance = Math.random() * radius * 1.2
			const size = radius * (0.25 + Math.random() * 0.5)

			bloodLayer.fillStyle(i === 0 ? 0x7f0f14 : 0xa3181f, i === 0 ? 0.85 : 0.62)
			bloodLayer.fillEllipse(
				enemy.x + Math.cos(angle) * distance,
				enemy.y + Math.sin(angle) * distance,
				size * 2.1,
				size * 1.6,
			)
		}
	}

	// Создаёт нового врага и добавляет его в игровой массив.
	function spawn() {
		const { scene, state } = ctx
		const roads = ctx.map.routes ?? ctx.map.roadPoints
		const spawners = ctx.map.spawners

		// В пользовательской карте план волны задаёт, какая казарма
		// и какой вид монстров выпускает врага следующим.
		const unit =
			spawners.length > 0
				? waveSpawnUnits(ctx.map, state.wave)[state.spawnedInWave]
				: undefined

		let routeIndex: number
		let stats: {
			type: EnemyType
			hp: number
			speed: number
			reward: number
			xp: number
			radius: number
			color: number
			damage: number
		}

		if (unit) {
			const troop = unit.troop
			const base = ENEMY_TYPES[troop.type]
			const level = Math.max(0, state.wave - 1)
			const modifiers = waveModifiers(
				ctx.map.waves,
				state.wave,
				ctx.map.spawners[unit.spawnerIndex]?.growth,
			)

			routeIndex = unit.spawnerIndex
			stats = {
				type: troop.type,
				hp: Math.max(1, Math.round(troop.health * modifiers.health)),
				speed: Math.max(1, Math.round(troop.speed * modifiers.speed)),
				reward: Math.round(base.reward * (1 + level * WAVE_REWARD_GROWTH)),
				xp: xpForKill(troop.type, state.wave),
				radius: base.radius,
				color: base.color,
				damage: troop.strength,
			}
		} else if (spawners.length > 0) {
			// План волны закончился (например, сохранение от старой карты).
			return
		} else {
			// Начало новой группы выбирает случайную дорогу, остальные
			// враги группы идут по ней же, чтобы двигаться плотно.
			const groupSize = enemyGroupSize(state.wave)
			const startsNewGroup =
				state.spawnedInWave === 0 || state.spawnedInWave % groupSize === 0
			if (
				startsNewGroup ||
				groupRouteIndex === null ||
				groupRouteIndex >= roads.length
			) {
				groupRouteIndex = Math.floor(Math.random() * roads.length)
			}

			routeIndex = groupRouteIndex
			stats = { ...enemyStats(state.wave, state.spawnedInWave), damage: 1 }
		}

		// Увеличиваем счётчик созданных врагов текущей волны.
		state.spawnedInWave++

		if (routeIndex < 0 || routeIndex >= roads.length) routeIndex = 0
		const route = roads[routeIndex]
		const start = route?.[0]
		if (!route || !start) return

		// Создаём тело врага и полоску здоровья.
		const { body, healthBar } = createEnemyView(
			scene,
			start.x,
			start.y,
			stats.radius,
			stats.color,
			stats.type,
		)

		// Добавляем врага в массив активных врагов.
		const enemy: Enemy = {
			type: stats.type,
			x: start.x,
			y: start.y,
			slowTimer: 0,
			hp: stats.hp,
			maxHp: stats.hp,
			speed: stats.speed,
			damage: stats.damage,
			reward: stats.reward,
			xp: stats.xp,
			pathIndex: 1,
			routeIndex,
			route,
			body,
			healthBar,
			burnDamage: 0,
			burnTimer: 0,
		}

		state.enemies.push(enemy)

		// Сразу отображаем здоровье только что созданного врага.
		drawHealthBar(enemy)
	}

	// Удаляет врага и при необходимости уменьшает количество жизней игрока.
	function remove(index: number, reachedExit: boolean) {
		const { state, setStatus } = ctx
		const [enemy] = state.enemies.splice(index, 1)

		// Удаляем графическое тело врага и полоску здоровья.
		enemy.body.destroy()
		enemy.healthBar.destroy()

		if (!reachedExit) return

		// Каждый враг снимает прочность замка: у обычных карт это одна
		// жизнь, у пользовательских — сила, заданная в казарме.
		const damageToCastle = Math.max(1, Math.round(enemy.damage))
		state.lives = Math.max(0, state.lives - damageToCastle)

		// Сообщаем игроку о прорыве врага.
		setStatus(
			ctx.map.spawners.length > 0
				? `Враг прорвался! Замок потерял ${damageToCastle} прочности.`
				: 'Враг прорвался! Потеряна 1 жизнь.',
		)

		// Если жизни закончились, игра завершена.
		if (state.lives <= 0) {
			state.lives = 0
			hooks.onGameOver()
		}
	}

	// Создаёт врагов по расписанию текущей волны.
	function updateSpawning(delta: number) {
		const { state } = ctx

		// Увеличиваем таймер появления врагов на время прошедшего кадра.
		state.spawnCooldown += delta

		// В пользовательской карте казармы выпускают врагов ровным потоком.
		const delay =
			ctx.map.spawners.length > 0
				? CUSTOM_ENEMY_SPAWN_INTERVAL
				: enemySpawnDelay(state.wave, state.spawnedInWave)

		// Создаём врага, когда подошло время и в волне ещё остались враги.
		if (state.spawnRemaining > 0 && state.spawnCooldown >= delay) {
			state.spawnCooldown = 0
			spawn()
			state.spawnRemaining--
		}
	}

	// Обновляет положение всех врагов на маршруте.
	function update(delta: number) {
		const { state } = ctx

		// Преобразуем прошедшее время из миллисекунд в секунды.
		const distancePerFrame = delta / 1000

		// Обходим массив с конца, чтобы безопасно удалять врагов по индексу.
		for (let i = state.enemies.length - 1; i >= 0; i--) {
			const enemy = state.enemies[i]

			// Поджог тикает независимо от движения и может добить врага.
			if (enemy.burnTimer > 0 && enemy.burnDamage > 0) {
				enemy.burnTimer = Math.max(0, enemy.burnTimer - delta)
				damage(enemy, enemy.burnDamage * distancePerFrame)

				// Враг погиб от огня — дальше обновлять нечего.
				if (!state.enemies.includes(enemy)) continue
				if (enemy.burnTimer === 0) enemy.body.clearTint()
			}

			// Определяем следующую точку маршрута для этого врага.
			const target = enemy.route[enemy.pathIndex]

			// Если следующей точки нет, считаем, что маршрут завершён.
			if (!target) {
				remove(i, true)
				continue
			}

			// Вычисляем разницу координат между врагом и следующей точкой.
			const dx = target.x - enemy.x
			const dy = target.y - enemy.y

			// Рассчитываем расстояние до следующей точки.
			const distance = Math.hypot(dx, dy)

			// Замедление действует ограниченное время.
			if (enemy.slowTimer > 0) {
				enemy.slowTimer = Math.max(0, enemy.slowTimer - delta)
			}

			// Если замедление активно, скорость врага уменьшается вдвое.
			const speedMultiplier = enemy.slowTimer > 0 ? 0.5 : 1

			// Рассчитываем расстояние, которое враг пройдёт за текущий кадр.
			const step = enemy.speed * speedMultiplier * distancePerFrame

			// Если враг достиг точки или находится совсем рядом, переходим к следующей.
			if (distance <= step || distance < 0.1) {
				enemy.x = target.x
				enemy.y = target.y
				enemy.pathIndex++

				// Проверяем, достиг ли враг конца маршрута.
				if (enemy.pathIndex >= enemy.route.length) {
					remove(i, true)
					continue
				}
			} else {
				// Нормализуем направление движения и перемещаем врага.
				enemy.x += (dx / distance) * step
				enemy.y += (dy / distance) * step
			}

			// Перемещаем графическое тело вслед за игровыми координатами.
			enemy.body.setPosition(enemy.x, enemy.y)

			// Обновляем положение и заполнение полоски здоровья.
			drawHealthBar(enemy)
		}
	}

	// Наносит урон врагу и удаляет его, если здоровье закончилось.
	function damage(enemy: Enemy, damageAmount: number) {
		const { state } = ctx

		// Не наносим урон врагу, которого уже удалили из игрового массива.
		if (!state.enemies.includes(enemy)) return

		// Не наносим урон монстрам, которые ещё не вошли на поле.
		if (!isInsideBoardPoint(enemy.x, enemy.y)) return

		// Уменьшаем текущее здоровье врага.
		enemy.hp -= damageAmount

		// Учитываем нанесённый урон в статистике.
		state.stats.damageDealt += damageAmount

		// Если здоровье закончилось, уничтожаем врага.
		if (enemy.hp <= 0) {
			// Оставляем на дороге след, который держится до конца волны.
			leaveBlood(enemy)

			// Начисляем игроку награду за уничтожение.
			state.gold += enemy.reward
			state.stats.monstersKilled++

			// За убийство даём опыт; заполненная шкала повышает уровень
			// и добавляет карточку улучшения в очередь.
			const progress = addExperience(state, enemy.xp)
			state.level = progress.level
			state.xp = progress.xp
			state.pendingUpgrades = progress.pendingUpgrades

			// Удаляем врага без потери жизни.
			remove(state.enemies.indexOf(enemy), false)
			return
		}

		// Если враг выжил, обновляем его полоску здоровья.
		drawHealthBar(enemy)
	}

	// Поджигает врага: берём самый сильный поджог и продлеваем горение.
	function applyBurn(enemy: Enemy, damagePerSecond: number, duration: number) {
		const { state } = ctx
		if (!state.enemies.includes(enemy)) return

		enemy.burnDamage = Math.max(enemy.burnDamage, damagePerSecond)
		enemy.burnTimer = Math.max(enemy.burnTimer, duration)
		enemy.body.setTint(0xff7b3a)
	}

	// Возвращает на поле врагов, которые были живы на момент сохранения.
	function restore(entries: readonly SessionEnemy[]) {
		const { scene, state } = ctx
		const routes = ctx.map.routes ?? ctx.map.roadPoints

		for (const saved of entries.slice(0, MAX_RESTORED_ENEMIES)) {
			const route = routes[saved.routeIndex]
			if (!route) continue
			if (!Number.isInteger(saved.pathIndex)) continue
			if (saved.pathIndex < 0 || saved.pathIndex >= route.length) continue
			if (!(saved.hp > 0) || saved.maxHp < saved.hp) continue

			const config = ENEMY_TYPES[saved.type]
			const { body, healthBar } = createEnemyView(
				scene,
				saved.x,
				saved.y,
				config.radius,
				config.color,
				saved.type,
			)

			const enemy: Enemy = {
				type: saved.type,
				x: saved.x,
				y: saved.y,
				hp: saved.hp,
				maxHp: saved.maxHp,
				speed: saved.speed,
				damage: 1,
				reward: saved.reward,
				xp: saved.xp,
				pathIndex: saved.pathIndex,
				routeIndex: saved.routeIndex,
				route,
				slowTimer: saved.slowTimer,
				burnDamage: saved.burnDamage,
				burnTimer: saved.burnTimer,
				body,
				healthBar,
			}

			state.enemies.push(enemy)
			// Горящий враг должен выглядеть горящим и после загрузки.
			if (enemy.burnTimer > 0) enemy.body.setTint(0xff7b3a)
			drawHealthBar(enemy)
		}
	}

	// Убирает все следы с дороги: следы живут только до конца волны.
	function clearBlood() {
		bloodLayer.clear()
	}

	// Удаляет всех врагов со сцены.
	function clear() {
		const { state } = ctx

		for (const enemy of state.enemies) {
			enemy.body.destroy()
			enemy.healthBar.destroy()
		}

		state.enemies.length = 0
		groupRouteIndex = null
		bloodLayer.clear()
	}

	return {
		updateSpawning,
		update,
		damage,
		applyBurn,
		restore,
		clearBlood,
		clear,
	}
}