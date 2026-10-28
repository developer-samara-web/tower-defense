export type PlayerProfile = {
	id: string
	login: string
	email: string
	record: number
	bestWave?: number
}

export type PlayerScore = {
	id: string
	login?: string
	wave: number
	gold: number
	createdAt: string
}

export type GameRecord = {
	id: string
	wave: number
	gold: number
	level: number
	monstersKilled: number
	buildingsBuilt: number
	moneySpent: number
	damageDealt: number
	createdAt: string
}

export type GameRecordInput = Omit<GameRecord, 'id' | 'createdAt'>

export type GamesPage = {
	games: GameRecord[]
	hasMore: boolean
	nextCursor: string | null
}
