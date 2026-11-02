// Статус ответа решает, что делает игрок: 401 — перелогинивается,
// 403/404 — возвращается к своим картам, всё остальное — просто повторяет
// попытку. Поэтому ошибку несём вместе со статусом, а не только текстом.
export class ApiError extends Error {
	readonly status: number

	constructor(status: number, message: string) {
		super(message)
		this.name = 'ApiError'
		this.status = status
	}
}

// Тип-предикат, а не просто boolean: вызывающему коду нужен не только факт
// «не авторизован», но и текст ошибки, который TypeScript иначе не разрешит.
export function isUnauthorized(error: unknown): error is ApiError {
	return error instanceof ApiError && error.status === 401
}

// Текст сервера показывает игроку, свой текст держим как запасной:
// ответ может быть пустым или HTML-страницей.
export async function readOk<T>(res: Response, fallback: string): Promise<T> {
	const data: unknown = await res.json().catch(() => null)

	if (!res.ok) {
		const message =
			typeof (data as { error?: unknown })?.error === 'string'
				? (data as { error: string }).error
				: fallback
		throw new ApiError(res.status, message)
	}

	return data as T
}
