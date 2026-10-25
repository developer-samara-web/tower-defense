import type { TowerType } from '@/features/game/config/game.config'

type TowerIconProps = {
	type: TowerType
	color: string
}

export default function TowerIcon({ type, color }: TowerIconProps) {
	const common = {
		fill: 'none',
		stroke: color,
		strokeLinecap: 'square' as const,
		strokeLinejoin: 'miter' as const,
		strokeWidth: 2.2,
	}

	return (
		<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[inset_0_0_4px_rgba(0,0,0,0.8)]" aria-hidden="true">
			<svg viewBox="0 0 24 24" className="h-5 w-5">
				{type === 'ice' && <><path {...common} d="M2 2l10 10M14 2l-10 10M2 14l10-10M14 14l-10 10" /><rect {...common} x="10" y="10" width="4" height="4" /></>}
				{type === 'fire' && <><path {...common} d="M12 4l2 6 2-6-2-2-2 2ZM10 10l-2 4 4-4-2 4" /><circle {...common} cx="12" cy="16" r="2" /></>}
				{type === 'earth' && <><path {...common} d="M4 20l4-6 4 6 4-8 4 8M8 16l4 4M12 14l4-4" /><circle {...common} cx="12" cy="10" r="3" /></>}
			</svg>
		</span>
	)
}
