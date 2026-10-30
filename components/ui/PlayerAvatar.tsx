import Image from 'next/image'

import { avatarSrc, frameSrc } from '@/lib/account/avatar-options'

type Props = {
	avatar?: string | null
	frame?: string | null
	alt?: string
	priority?: boolean
	// false — без своей рамки, когда портрет стоит внутри другой рамки.
	bordered?: boolean
	// Квадрат в пикселях. Для размеров, зависящих от экрана,
	// вместо него передают sizeClass.
	size?: number
	sizeClass?: string
	className?: string
}

// Канвас рамки 230×240, а окно под портрет в ней заметно меньше кадра,
// поэтому рамка рисуется крупнее квадрата аватара и налезает на него.
const FRAME_SCALE = 1.26
const FRAME_ASPECT = 230 / 240

// Портрет с рамкой в один кадр: одинаково выглядит в меню, профиле,
// статистике игры, топе и панели группы.
export default function PlayerAvatar({
	avatar,
	frame,
	alt = 'Аватар игрока',
	priority,
	bordered = true,
	size,
	sizeClass,
	className = '',
}: Props) {
	const overlay = frameSrc(frame)
	const px = size ?? 64

	return (
		<span
			className={`relative block shrink-0 bg-[#0f0a05] ${
				bordered ? 'border-2 border-[#79502b] shadow-[inset_0_0_0_2px_#21150c]' : ''
			} ${sizeClass ?? ''} ${className}`}
			style={size ? { width: size, height: size } : undefined}
		>
			<Image
				src={avatarSrc(avatar)}
				alt={alt}
				width={px}
				height={px}
				unoptimized
				priority={priority}
				// Абсолютно позиционирован, чтобы портрет не задавал высоту
				// контейнеру: в профиле квадрат тянется по росту текста.
				className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
			/>
			{overlay ? (
				<Image
					src={overlay}
					alt=""
					width={px}
					height={px}
					unoptimized
					aria-hidden="true"
					style={{
						width: `${FRAME_SCALE * FRAME_ASPECT * 100}%`,
						height: `${FRAME_SCALE * 100}%`,
					}}
					className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 [image-rendering:pixelated]"
				/>
			) : null}
		</span>
	)
}
