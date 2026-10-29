import type {
  MapCastle,
  MapDraft,
  MapSpawner,
} from '@/features/game/engine/map/custom-map'

export type UserProfile = {
  id: string
  login: string
  email: string
  record: number
  bestWave?: number
  role?: 'user' | 'admin'
  avatar?: string
  avatarFrame?: string
  gamesPlayed?: number
}

export type ScoreEntry = {
  id: string
  login?: string
  wave: number
  gold: number
  createdAt: string
}

// Путь карты в библиотеке: черновик автора, очередь модерации,
// публикация или отказ. Рейтинг выставляет администратор.
export type MapStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type MapSummary = {
  id: string
  name: string
  seed: string
  cols: number
  rows: number
  difficulty: string
  previewColor: string
  createdAt: string
  // Пользовательская карта из редактора или старая карта по сиду.
  custom: boolean
  castle: MapCastle | null
  spawners: Array<Pick<MapSpawner, 'x' | 'y'>>
  // Карта принадлежит текущему игроку.
  mine: boolean
  author: string | null
  status: MapStatus
  rated: boolean
}

export type MapDetail = MapSummary & {
  data: MapDraft | null
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
