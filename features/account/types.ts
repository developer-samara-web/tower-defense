export type PlayerProfile = {
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
}

export type PlayerScore = {
	id: string
	login?: string
	wave: number
	gold: number
	createdAt: string
	// Внешность игрока, чтобы топ показывал портрет и титул.
	avatar?: string
	avatarFrame?: string
	title?: string
}

export type GameRecord = {
	id: string
	wave: number
	gold: number
	// Забег на одобренной рейтинговой карте — только такие двигают рейтинг.
	rated: boolean
	level: number
	monstersKilled: number
	buildingsBuilt: number
	moneySpent: number
	damageDealt: number
	createdAt: string
}

// Рейтинг карта получает на сервере, поэтому клиент передаёт только её id.
export type GameRecordInput = Omit<GameRecord, 'id' | 'createdAt' | 'rated'> & {
	mapId?: string | null
}

export type GamesPage = {
	games: GameRecord[]
	hasMore: boolean
	nextCursor: string | null
}
