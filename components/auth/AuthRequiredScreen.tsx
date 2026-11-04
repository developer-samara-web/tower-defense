'use client'

import { useRouter } from 'next/navigation'

import AccessScreen from '@/components/ui/AccessScreen'
import { NOT_AUTHORIZED } from '@/lib/access-messages'

// Общая заглушка для закрытых разделов: меню, выбор режима, карты и
// редактор не должны открываться гостю. Токен живёт в localStorage,
// поэтому проверка клиентская — серверный middleware его не увидит.
export default function AuthRequiredScreen() {
	const router = useRouter()

	return (
		<AccessScreen
			title="Нужен вход в аккаунт"
			message={NOT_AUTHORIZED}
			actions={[
				{ label: 'Войти', onClick: () => router.push('/auth') },
				{ label: 'На главную', onClick: () => router.push('/') },
			]}
		/>
	)
}
