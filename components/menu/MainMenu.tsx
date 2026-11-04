import type { PlayerProfile } from '@/features/account/types'
import MenuButton from './MenuButton'
import MenuShell from './MenuShell'

type Props = {
	user: PlayerProfile | null
	onPlay: () => void
	onAdventures: () => void
	onProfile: () => void
	onLeaderboard: () => void
	onForum: () => void
	onLogout: () => void
}

// Главное меню: только вход в игру, тропа приключений, таблица лидеров,
// статистика и выход.
export default function MainMenu({
	user,
	onPlay,
	onAdventures,
	onProfile,
	onLeaderboard,
	onForum,
	onLogout,
}: Props) {
	return (
		<MenuShell user={user}>
			<MenuButton variant="primary" onClick={onPlay}>
				Играть
			</MenuButton>
			{/* Компендиум выделен своим цветом: это не режим боя, а путь
				по картам с призами, и терять его в списке нельзя. */}
			<MenuButton variant="adventure" onClick={onAdventures}>
				Приключения
			</MenuButton>
			<MenuButton onClick={onLeaderboard}>Таблица лидеров</MenuButton>
			<MenuButton onClick={onForum}>Форум</MenuButton>
			<MenuButton onClick={onProfile}>Статистика</MenuButton>
			<MenuButton variant="danger" onClick={onLogout}>
				Выйти
			</MenuButton>
		</MenuShell>
	)
}
