// Метка клавиши на кнопке: башни, карты улучшения и рост читаются как
// одно управление, поэтому стиль у них общий.
type Props = {
	label: string
	className?: string
}

export default function KeyChip({ label, className = '' }: Props) {
	return (
		<span
			aria-hidden="true"
			className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-[#6b4c1f] bg-[#0f0a05]/85 text-[10px] font-black leading-none text-amber-300 ${className}`}
		>
			{label}
		</span>
	)
}
