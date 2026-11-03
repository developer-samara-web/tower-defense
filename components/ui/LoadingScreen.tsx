type LoadingScreenProps = {
	message?: string
}

// Прелоадер доступа: страница ещё не знает, есть у игрока сессия или нет.
// Пока /api/auth/me в пути, показываем её, а не заглушку «Нужен вход в
// аккаунт», иначе владелец сессии видит отказ на долю секунды при переходе
// между разделами. Фон совпадает с профилем и меню, поэтому экран не мигает
// чёрным; стилистически это та же пластина, что и у заглушки доступа.
export default function LoadingScreen({ message = 'Загрузка…' }: LoadingScreenProps) {
	return (
		<main className="relative flex h-[100dvh] w-full items-center justify-center bg-[url(/ui/background.png)] bg-cover bg-center px-4 font-mono text-[#e2c8a0]">
			<div className="flex w-[min(460px,92vw)] flex-col items-center gap-3 border-2 border-[#79502b] bg-[#21150c] px-6 py-8 text-center">
				<div className="flex h-[6px] w-40 overflow-hidden border border-[#79502b] bg-[#150d07]">
					<div className="td-loading-bar h-full w-1/3 bg-amber-400" />
				</div>
				<p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">{message}</p>
			</div>
		</main>
	)
}
