import type { PlayerProfile } from '@/features/account/types'
import MenuButton from './MenuButton'
import MenuShell from './MenuShell'

type Props = {
	user: PlayerProfile | null
	onPlay: () => void
	onTower: () => void
	onProfile: () => void
	onLeaderboard: () => void
	onForum: () => void
	onLogout: () => void
}

// Главное меню: только вход в игру, бесконечная башня, таблица лидеров,
// статистика и выход.
export default function MainMenu({
	user,
	onPlay,
	onTower,
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
			{/* Башня выделена своим цветом: это не режим боя, а бесконечный
				подъём по этажам с наградой за каждый новый этаж. */}
			<MenuButton variant="tower" onClick={onTower}>
				Бесконечная башня
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
