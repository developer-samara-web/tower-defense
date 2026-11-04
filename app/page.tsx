import type { Metadata } from 'next'

import LandingPage from '@/components/landing/LandingPage'

export const metadata: Metadata = {
	title: 'TowerForce — браузерная tower defense',
	description:
		'Строй башни трёх стихий, держи волны врагов и защити замок. Прокачка, карты улучшений, приключения, библиотека карт, редактор и общий рейтинг — бесплатно в браузере.',
}

export default function HomePage() {
	return <LandingPage />
}
