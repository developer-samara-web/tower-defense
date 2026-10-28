import type { PlayerProfile } from '@/features/account/types'
import MenuButton from './MenuButton'
import MenuShell from './MenuShell'

type Props = {
	user: PlayerProfile | null
	onBack: () => void
	onRandomMap: () => void
}

// Подменю «Играть»: пока работает только случайная карта,
// остальные режимы отмечены как «скоро».
export default function PlayMenu({ user, onBack, onRandomMap }: Props) {
	return (
		<MenuShell title="Играть" user={user}>
			<MenuButton disabled badge="скоро">
				Выбрать карту
			</MenuButton>
			<MenuButton disabled badge="скоро">
				Создать карту
			</MenuButton>
			<MenuButton variant="primary" onClick={onRandomMap}>
				Случайная карта
			</MenuButton>
			<MenuButton disabled badge="скоро">
				Кооператив
			</MenuButton>
			<MenuButton onClick={onBack}>Назад</MenuButton>
		</MenuShell>
	)
}
