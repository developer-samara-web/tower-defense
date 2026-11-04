import type { Metadata } from 'next'

import UpdatesPage from '@/components/updates/UpdatesPage'

export const metadata: Metadata = {
	title: 'Обновления — TowerForce',
	description:
		'История версий TowerForce: новые режимы, карты, баланс, интерфейс и исправления по датам.',
}

export default function UpdatesRoute() {
	return <UpdatesPage />
}
