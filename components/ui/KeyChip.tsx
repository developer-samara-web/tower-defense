// Метка клавиши на кнопке: башни, карты улучшения и рост читаются как
// одно управление, поэтому стиль у них общий. Ширина не фиксирована:
// подписи вроде «Стрелки» или «Колесо» не должны вылезать за рамку.
type Props = {
	label: string
	className?: string
}

export default function KeyChip({ label, className = '' }: Props) {
	return (
		<span
			aria-hidden="true"
			className={`flex h-[18px] min-w-[18px] shrink-0 items-center justify-center whitespace-nowrap border border-[#6b4c1f] bg-[#0f0a05]/85 px-1 text-[10px] font-black leading-none text-amber-300 ${className}`}
		>
			{label}
		</span>
	)
}
