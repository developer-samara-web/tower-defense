import type { AdventureBoard } from '@/lib/compendium/adventure-rules'
import { readOk } from './api-error'

// Тропа «Приключений» приходит с сервера одним куском: порядок карт,
// их публикация и рекорды игрока.
export async function fetchAdventureBoard(token: string): Promise<AdventureBoard> {
	const res = await fetch('/api/adventures', {
		headers: { Authorization: 'Bearer ' + token },
	})

	return readOk<AdventureBoard>(res, 'Не удалось загрузить карту приключений')
}
