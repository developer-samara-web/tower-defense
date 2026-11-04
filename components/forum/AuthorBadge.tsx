import type { ReactNode } from 'react'

import PlayerAvatar from '@/components/ui/PlayerAvatar'
import PlayerTitle from '@/components/ui/PlayerTitle'
import { NO_TITLE } from '@/lib/account/title-options'
import type { ForumAuthor } from '@/types'

type Props = {
	author: ForumAuthor
	size?: number
	// Время сообщения или другая подпись под ником.
	meta?: ReactNode
}

// Автор сообщения: портрет, ник, титул и метка администратора.
// Один компонент на форум и комментарии к картам, чтобы списки не
// расходились по высоте и оформлению.
export default function AuthorBadge({ author, size = 26, meta }: Props) {
	return (
		<span className="flex min-w-0 items-center gap-2">
			<PlayerAvatar
				avatar={author.avatar}
				frame={author.avatarFrame}
				size={size}
				alt=""
				bordered={false}
			/>
			<span className="flex min-w-0 flex-col leading-tight">
				<span className="flex min-w-0 items-center gap-1.5">
					<span className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-amber-100">
						{author.login}
					</span>
					{author.role === 'admin' ? (
						<span className="shrink-0 border border-red-500/60 bg-red-500/10 px-1 text-[7px] font-black uppercase tracking-[0.1em] text-red-300">
							Админ
						</span>
					) : null}
				</span>
				{author.title && author.title !== NO_TITLE ? (
					<PlayerTitle title={author.title} className="truncate text-[7px] tracking-[0.1em]" />
				) : null}
				{meta ? (
					<span className="truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#8a7340]">
						{meta}
					</span>
				) : null}
			</span>
		</span>
	)
}
