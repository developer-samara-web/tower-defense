import Phaser from 'phaser'

import {
	HEALTH_BAR_HEIGHT,
	HEALTH_BAR_OFFSET,
	HEALTH_BAR_WIDTH,
	type EnemyType,
} from '../../config/game.config'
import type { Enemy } from '../../types/game.types'

// Создаёт графическое представление врага: тело и полоску здоровья.
export function createEnemyView(
	scene: Phaser.Scene,
	x: number,
	y: number,
	radius: number,
	color: number,
	type: EnemyType,
) {
	const body = createEnemyBody(scene, x, y, radius, color, type)
	const healthBar = scene.add.graphics().setDepth(4)

	return { body, healthBar }
}

// Рисует тело врага с учётом его размера, цвета и типа.
function createEnemyBody(
	scene: Phaser.Scene,
	x: number,
	y: number,
	radius: number,
	color: number,
	type: EnemyType,
) {
	// Рассчитываем ширину и высоту тела на основе радиуса.
	const width = radius * 2
	const height = radius * 2

	// Пиксельное тело врага — квадрат с тёмной обводкой.
	const fill = Phaser.Display.Color.IntegerToColor(color).darken(8).color
	const accent = Phaser.Display.Color.IntegerToColor(color).brighten(16).color

	const body = scene.add.graphics().setPosition(x, y).setDepth(3)

	body.fillStyle(fill, 1)
	body.fillRect(-radius, -radius, width, height)

	// Пиксельная тёмная рамка
	body.lineStyle(2, 0x1a0f08, 1)
	body.strokeRect(-radius, -radius, width, height)

	// Пиксельная подсветка (квадрат)
	body.fillStyle(accent, 1)
	body.fillRect(-radius * 0.36, -radius * 0.32, width * 0.72, height * 0.2)

	// Пиксельная иконка
	drawEnemyIcon(body, type, radius)

	// Возвращаем созданный графический объект для дальнейшего перемещения.
	return body
}

// Рисует символ, который визуально отличает один тип врага от другого.
function drawEnemyIcon(
	graphics: Phaser.GameObjects.Graphics,
	type: EnemyType,
	radius: number,
) {
	// Используем белый цвет, чтобы символ контрастировал с телом врага.
	const iconColor = 0xffffff

	// Рассчитываем размер символа относительно размера врага.
	const size = Math.max(3, radius * 0.25)

	// Настраиваем толщину линий и их цвет.
	graphics.lineStyle(Math.max(1, radius * 0.1), iconColor, 0.9)

	// Символ разведчика — круг с двумя небольшими точками.
	if (type === 'scout') {
		// Рисуем круг.
		graphics.strokeCircle(0, radius * 0.18, size)

		// Добавляем левую точку.
		graphics.fillStyle(iconColor, 0.9)
		graphics.fillCircle(-size * 0.35, radius * 0.18, 0.8)

		// Добавляем правую точку.
		graphics.fillCircle(size * 0.35, radius * 0.18, 0.8)

		// Завершаем отрисовку символа разведчика.
		return
	}

	// Символ тяжёлого врага — треугольник.
	if (type === 'brute') {
		// Выбираем цвет заливки.
		graphics.fillStyle(iconColor, 0.9)

		// Рисуем треугольник внутри тела врага.
		graphics.fillTriangle(
			0,
			radius * 0.58,
			-size,
			-size * 0.1 + radius * 0.18,
			size,
			-size * 0.1 + radius * 0.18,
		)

		// Завершаем отрисовку символа тяжёлого врага.
		return
	}

	// Символ быстрого врага — молния.
	if (type === 'sprinter') {
		// Выбираем цвет заливки молнии.
		graphics.fillStyle(iconColor, 0.9)

		// Начинаем построение контура молнии.
		graphics.beginPath()

		// Последовательно задаём вершины молнии.
		graphics.moveTo(size * 0.15, -size * 0.85 + radius * 0.18)
		graphics.lineTo(-size * 0.7, radius * 0.18)
		graphics.lineTo(-size * 0.1, radius * 0.18)
		graphics.lineTo(-size * 0.25, size * 0.9 + radius * 0.18)
		graphics.lineTo(size * 0.75, -size * 0.15 + radius * 0.18)
		graphics.lineTo(size * 0.1, -size * 0.15 + radius * 0.18)

		// Замыкаем контур молнии.
		graphics.closePath()

		// Заливаем получившуюся фигуру.
		graphics.fillPath()

		// Завершаем отрисовку символа быстрого врага.
		return
	}

	// Для остальных типов рисуем условный символ брони.
	graphics.beginPath()

	// Последовательно задаём вершины символа.
	graphics.moveTo(-size, radius * 0.58)
	graphics.lineTo(-size, -size * 0.25 + radius * 0.18)
	graphics.lineTo(0, size * 0.15 + radius * 0.18)
	graphics.lineTo(size, -size * 0.25 + radius * 0.18)
	graphics.lineTo(size, radius * 0.58)

	// Отрисовываем контур символа.
	graphics.strokePath()
}

// Отрисовывает полоску здоровья над врагом.
export function drawHealthBar(enemy: Enemy) {
	// Берём размеры полоски из конфигурации.
	const width = HEALTH_BAR_WIDTH
	const height = HEALTH_BAR_HEIGHT

	// Центрируем полоску относительно врага по горизонтали.
	const x = enemy.x - width / 2

	// Размещаем полоску выше тела врага.
	const y = enemy.y - HEALTH_BAR_OFFSET

	// Рассчитываем долю оставшегося здоровья от 0 до 1.
	const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1)

	// Очищаем предыдущее изображение полоски перед перерисовкой.
	enemy.healthBar.clear()

	// Пиксельная полоска здоровья — тёмно-коричневый фон, золотое заполнение.
	enemy.healthBar.fillStyle(0x2a1d0a, 1)
	enemy.healthBar.fillRect(x, y, width, height)

	enemy.healthBar.fillStyle(0xb89a3a, 1)
	enemy.healthBar.fillRect(x, y, width * ratio, height)
}
