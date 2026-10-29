import type { PlayerProfile } from '@/features/account/types'
import MenuButton from './MenuButton'
import MenuShell from './MenuShell'

type Props = {
	user: PlayerProfile | null
	onPlay: () => void
	onProfile: () => void
	onLeaderboard: () => void
	onLogout: () => void
	token?: string | null
	onUserChange?: (user: PlayerProfile) => void
}

// Главное меню: только вход в игру, таблица лидеров, статистика и выход.
export default function MainMenu({
	user,
	onPlay,
	onProfile,
	onLeaderboard,
	onLogout,
	token,
	onUserChange,
}: Props) {
	return (
		<MenuShell title="Главное меню" user={user} token={token} onUserChange={onUserChange}>
			<MenuButton variant="primary" onClick={onPlay}>
				Играть
			</MenuButton>
			<MenuButton onClick={onLeaderboard}>Таблица лидеров</MenuButton>
			<MenuButton onClick={onProfile}>Статистика</MenuButton>
			<MenuButton variant="danger" onClick={onLogout}>
				Выйти
			</MenuButton>
		</MenuShell>
	)
}
