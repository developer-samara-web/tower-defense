import { ENEMY_SPAWN_INTERVAL } from '../../config/game.config'
import { enemyStats, isInsideBoardPoint } from '../../domain/game-rules'
import type { Enemy } from '../../types/game.types'
import type { GameContext } from '../game-context'
import { ROAD_POINTS } from '../map/game-map'
import { createEnemyView, drawHealthBar } from '../rendering/enemy-view'

type EnemyHooks = {
	// Вызывается, когда у игрока закончились жизни.
	onGameOver: () => void
}

export type EnemySystem = {
	updateSpawning: (delta: number) => void
	update: (delta: number) => void
	damage: (enemy: Enemy, damage: number) => void
	clear: () => void
}

// Отвечает за появление врагов, их перемещение по маршруту и урон.
export function createEnemySystem(
	ctx: GameContext,
	hooks: EnemyHooks,
): EnemySystem {
	// Создаёт нового врага и добавляет его в игровой массив.
	function spawn() {
		const { scene, state } = ctx

		// Получаем характеристики врага: тип, здоровье, скорость, награду и цвет.
		const { type, hp, speed, reward, radius, color } = enemyStats(
			state.wave,
			state.spawnedInWave,
		)

		// Увеличиваем счётчик созданных врагов текущей волны.
		state.spawnedInWave++

		// Получаем координаты начала случайной дороги.
		const route = ROAD_POINTS[Math.floor(Math.random() * ROAD_POINTS.length)]
		const start = route[0]

		// Создаём тело врага и полоску здоровья.
		const { body, healthBar } = createEnemyView(
			scene,
			start.x,
			start.y,
			radius,
			color,
			type,
		)

		// Добавляем врага в массив активных врагов.
		const enemy: Enemy = {
			type,
			x: start.x,
			y: start.y,
			slowTimer: 0,
			hp,
			maxHp: hp,
			speed,
			reward,
			pathIndex: 1,
			route,
			body,
			healthBar,
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

		// Если враг достиг выхода, игрок теряет одну жизнь.
		state.lives--

		// Сообщаем игроку о прорыве врага.
		setStatus('Враг прорвался! Потеряна 1 жизнь.')

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

		// Создаём врага, когда подошло время и в волне ещё остались враги.
		if (state.spawnRemaining > 0 && state.spawnCooldown >= ENEMY_SPAWN_INTERVAL) {
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

			// Уменьшаем оставшееся время замедления.
			enemy.slowTimer = Math.max(0, enemy.slowTimer - delta)

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

		// Если здоровье закончилось, уничтожаем врага.
		if (enemy.hp <= 0) {
			// Начисляем игроку награду за уничтожение.
			state.gold += enemy.reward

			// Удаляем врага без потери жизни.
			remove(state.enemies.indexOf(enemy), false)
			return
		}

		// Если враг выжил, обновляем его полоску здоровья.
		drawHealthBar(enemy)
	}

	// Удаляет всех врагов со сцены.
	function clear() {
		const { state } = ctx

		for (const enemy of state.enemies) {
			enemy.body.destroy()
			enemy.healthBar.destroy()
		}

		state.enemies.length = 0
	}

	return { updateSpawning, update, damage, clear }
}
