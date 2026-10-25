
import type Phaser from 'phaser'
import type { EnemyType, TowerType } from '../config/game.config'

export type Tower = {
  id: string
  type: TowerType
  level: number
  x: number
  y: number
  cooldown: number
  body: Phaser.GameObjects.Image
  icon: Phaser.GameObjects.Container
  levelText: Phaser.GameObjects.Text
}

export type Enemy = {
	type: EnemyType
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  reward: number
  pathIndex: number
  route: { x: number; y: number }[]
  body: Phaser.GameObjects.Graphics
  healthBar: Phaser.GameObjects.Graphics
  slowTimer: number
}
