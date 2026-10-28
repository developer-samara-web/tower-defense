export type UserProfile = {
  id: string
  login: string
  email: string
  record: number
  bestWave?: number
}

export type ScoreEntry = {
  id: string
  login?: string
  wave: number
  gold: number
  createdAt: string
}

import { type TowerType } from '@/features/game/config/game.config'

export type SelectedTowerInfo = {
  id: string
  type: TowerType
  name: string
  level: number
  maxLevel: number
  damage: number
  range: number
  attackSpeed: number
  crit: number
  burn: number
  chain: number
  execute: number
  upgradeCost: number | null
  sellValue: number
}
