import { redirect } from 'next/navigation'

// Старый адрес «Приключений»: режим заменён бесконечной башней.
// Редирект оставляем, чтобы внешние ссылки и закладки не ломались.
export default function AdventuresPage() {
	redirect('/tower')
}
