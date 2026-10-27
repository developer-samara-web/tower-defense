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
