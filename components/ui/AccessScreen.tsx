type AccessAction = {
	label: string
	onClick: () => void
}

type AccessScreenProps = {
	title: string
	message: string
	actions: AccessAction[]
}

// Заглушка доступа: страница без аккаунта не должна притворяться игрой.
// Текст приходит с сервера или из lib/access-messages, поэтому игрок видит
// причину, а не пустой экран.
export default function AccessScreen({ title, message, actions }: AccessScreenProps) {
	return (
		<main className="flex h-[100dvh] w-full items-center justify-center bg-[#0f0a05] px-4 font-mono">
			<section className="flex w-[min(460px,92vw)] flex-col items-center gap-4 border-2 border-[#79502b] bg-[#21150c] px-6 py-8 text-center">
				<h1 className="text-[12px] font-black uppercase tracking-[0.2em] text-amber-300">
					{title}
				</h1>
				<p className="text-[11px] font-bold leading-relaxed text-[#e2c8a0]">{message}</p>
				<div className="flex flex-wrap items-center justify-center gap-2">
					{actions.map((action) => (
						<button
							key={action.label}
							type="button"
							onClick={action.onClick}
							className="border-2 border-[#79502b] bg-[#150d07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
						>
							{action.label}
						</button>
					))}
				</div>
			</section>
		</main>
	)
}
