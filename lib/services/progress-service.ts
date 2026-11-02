import { readOk } from './api-error'

// Флаги прогресса обучения. Держим их на сервере: сброс localStorage не
// должен отменять уже пройденное обучение или возвращать показанный рассказ
// про рейтинг.
export type ProgressFlags = {
	tutorialCompleted: boolean
	ratedIntroShown: boolean
}

export async function fetchProgress(token: string): Promise<ProgressFlags> {
	const res = await fetch('/api/progress', {
		headers: { Authorization: 'Bearer ' + token },
	})
	return readOk<ProgressFlags>(res, 'Не удалось загрузить прогресс')
}

// Отметка «сделано»: сервер умеет только включать флаги, поэтому сюда
// приходит всегда частичный набор.
export async function markProgress(token: string, patch: Partial<ProgressFlags>) {
	const res = await fetch('/api/progress', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + token,
		},
		body: JSON.stringify(patch),
	})

	return readOk<ProgressFlags>(res, 'Не удалось сохранить прогресс')
}
