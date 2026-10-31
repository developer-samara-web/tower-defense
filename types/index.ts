import type {
  MapCastle,
  MapDraft,
  MapSpawner,
} from '@/features/game/engine/map/custom-map'
import type { MapPreview } from '@/features/game/engine/map/map-preview'

export type UserProfile = {
  id: string
  login: string
  email: string
  record: number
  bestWave?: number
  role?: 'user' | 'admin'
  avatar?: string
  avatarFrame?: string
  // id титула из lib/account/title-options.ts или 'none'.
  title?: string
  gamesPlayed?: number
  // Суммарная статистика по всем сыгранным партиям.
  monstersKilled?: number
  buildingsBuilt?: number
  // Очки рейтинга: сумма лучших результатов по рейтинговым картам.
  ratingPoints?: number
  // Место в общем топе по очкам рейтинга.
  rank?: number
  // Сколько рейтинговых карт игрок прошёл хотя бы раз.
  ratedMaps?: number
}

// Лучший результат игрока на одной карте — для блока «Лучшие карты» в профиле.
export type PlayerBestMap = {
  mapId: string
  name: string
  stars: number
  points: number
  wave: number
  plays: number
  rated: boolean
  achievedAt: string
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
  // Звёзды сложности: по ним считаются очки топа карты.
  stars: number
  // У карты есть доска рекордов — только у опубликованных карт.
  board: boolean
  // Уменьшенная сетка местности для миниатюры: трава, лес, вода, дороги.
  preview: MapPreview | null
}

export type MapDetail = MapSummary & {
  data: MapDraft | null
}

// Ответ /api/scores/best-maps: рекорды по картам и сводка рейтинга.
export type PlayerBestMaps = {
  maps: PlayerBestMap[]
  ratingPoints: number
  rank: number
  ratedMaps: number
}

// Строка топа конкретной карты — аналог leaderboards одного битмапа в osu!.
export type MapBoardRow = {
  userId: string
  login: string
  avatar: string
  avatarFrame: string
  title: string
  points: number
  wave: number
  gold: number
  // Звёзды карты на момент результата: пересчёт сложности не должен
  // переписывать уже выданные очки.
  stars: number
  plays: number
  rated: boolean
  achievedAt: string
}

// Та же строка в интерфейсе: `live` — текущий забег, ещё не отправленный на
// сервер, `rank` — настоящее место в топе карты, если строка пришла с сервера.
export type MapBoardRowView = MapBoardRow & { live?: boolean; rank?: number }

export type MapLeaderboard = {
  mapId: string
  name: string
  stars: number
  rated: boolean
  // false, если карта ещё не опубликована: у такой доски нет.
  board: boolean
  total: number
  entries: MapBoardRow[]
  // Строка зрителя, даже если он не попал в выдаваемую страницу топа.
  my: (MapBoardRow & { rank: number }) | null
}

// Ответ сервера на запись забега: очки, место в топе карты и новый рейтинг.
export type MapRunScore = {
  mapId: string
  stars: number
  points: number
  best: number
  isBest: boolean
  plays: number
  rank: number
  ratingPoints: number
  board: boolean
}
