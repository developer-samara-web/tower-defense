import Image from 'next/image'

type AuthScreenProps = {
	mode: 'login' | 'register'
	login: string
	email: string
	password: string
	loading: boolean
	error: string
	notice: string
	onModeChange: (mode: 'login' | 'register') => void
	onLoginChange: (value: string) => void
	onEmailChange: (value: string) => void
	onPasswordChange: (value: string) => void
	onSubmit: (event: React.FormEvent) => void
	onBack: () => void
}

export default function AuthScreen({
	mode,
	login,
	email,
	password,
	loading,
	error,
	notice,
	onModeChange,
	onLoginChange,
	onEmailChange,
	onPasswordChange,
	onSubmit,
	onBack,
}: AuthScreenProps) {
	return (
		<main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[url(/game/background.png)] bg-cover bg-center px-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="absolute inset-0 bg-gradient-to-b from-[#05080a]/75 via-[#0a0e12]/45 to-[#05080a]/85" />

			<div className="relative w-full max-w-md rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] sm:p-7">
				<button
					type="button"
					onClick={onBack}
					className="mb-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#8a7340] transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<span className="text-[13px] leading-none">←</span>
					На главную
				</button>

				<div className="mb-5 flex flex-col items-center gap-3">
					<Image
						src="/game/logo.png"
						alt="Legends of Prigranica"
						width={330}
						height={180}
						priority
						className="drop-shadow-[0_4px_8px_rgba(212,160,60,0.25)]"
					/>
					<h1 className="text-center text-2xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e]">
						Врата Замка
					</h1>
				</div>

				<form onSubmit={onSubmit} className="space-y-4">
					<div className="flex overflow-hidden rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/30">
						<button
							type="button"
							className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${
								mode === 'login' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'
							}`}
							onClick={() => onModeChange('login')}
						>
							Вход
						</button>
						<button
							type="button"
							className={`flex-1 py-2 text-xs font-black uppercase tracking-[0.15em] transition ${
								mode === 'register' ? 'bg-[#3a2a1a] text-amber-200' : 'text-[#7a5e30]'
							}`}
							onClick={() => onModeChange('register')}
						>
							Регистрация
						</button>
					</div>

					<input
						type="text"
						placeholder="Логин"
						value={login}
						onChange={(event) => onLoginChange(event.target.value)}
						className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:border-amber-600 focus:outline-none"
					/>

					{mode === 'register' ? (
						<input
							type="email"
							placeholder="Почта"
							value={email}
							onChange={(event) => onEmailChange(event.target.value)}
							className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:border-amber-600 focus:outline-none"
						/>
					) : null}

					<input
						type="password"
						placeholder="Пароль"
						value={password}
						onChange={(event) => onPasswordChange(event.target.value)}
						className="w-full rounded-none border-2 border-[#3a2a1a] bg-[#0f0a05]/60 px-3 py-2.5 text-xs font-bold text-amber-100 placeholder:text-[#5c3a1a] focus:border-amber-600 focus:outline-none"
					/>

					{notice ? <p className="text-xs font-black tracking-wide text-lime-400">{notice}</p> : null}
					{error ? <p className="text-xs font-black tracking-wide text-red-400">{error}</p> : null}

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] py-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5e6c8] shadow-[0_4px_0_#3a1d0a] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[2px] active:shadow-[0_2px_0_#3a1d0a] disabled:opacity-40"
					>
						{loading ? 'Загрузка...' : mode === 'login' ? 'Войти в Замок' : 'Создать Героя'}
					</button>
				</form>
			</div>
		</main>
	)
}
