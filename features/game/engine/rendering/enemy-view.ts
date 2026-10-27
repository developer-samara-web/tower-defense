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
	const texture =
		type === 'sprinter'
			? 'enemy-small'
			: type === 'brute'
				? 'enemy-big'
				: type === 'scout'
					? 'enemy-average'
					: 'enemy-boss'

	const size = Math.max(radius * 2.6, 16)

	const body = scene.add
		.image(x, y, texture)
		.setDisplaySize(size, size)
		.setOrigin(0.5)
		.setDepth(3)

	return body
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
