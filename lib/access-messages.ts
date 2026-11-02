// Тексты доступа живут отдельно от серверного хелпера: их показывает и
// клиент, а тянуть в браузер jsonwebtoken и mongoose нельзя.
export const NOT_AUTHORIZED = 'Вы не авторизованы. Войдите в аккаунт.'
export const SESSION_EXPIRED = 'Срок сессии истёк. Войдите заново.'
export const NO_ACCESS = 'Нет доступа к этой игре.'
export const BAD_REQUEST = 'Некорректный запрос.'
export const SERVER_ERROR = 'Сервер временно недоступен. Попробуйте позже.'
