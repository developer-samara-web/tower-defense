'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import type { PlayerProfile } from '@/features/account/types'
import { towerFloorReward } from '@/features/game/tower/tower-rules'
import { useTower } from '@/hooks/useTower'
import AccountCard from './AccountCard'

type Props = {
	user: PlayerProfile | null
	onBack: () => void
	onPlay: (floor: number) => void
}

type Tab = 'floors' | 'shop'

// Сколько этажей показывать вокруг текущего: башня бесконечна, поэтому
// рисуем окно, а не всю последовательность.
const FLOORS_ABOVE = 8
const FLOORS_BELOW = 6

const SHOP_ITEMS = [
	{
		icon: '🛡',
		name: 'Ремонт замка',
		text: 'Восстанавливает прочность перед началом этажа.',
		price: 120,
	},
	{
		icon: '🪙',
		name: 'Запас золота',
		text: 'Добавляет золото на старте этажа.',
		price: 200,
	},
	{
		icon: '⚡',
		name: 'Ускорение стройки',
		text: 'Башни строятся и улучшаются быстрее.',
		price: 350,
	},
	{
		icon: '❄',
		name: 'Ледяная ловушка',
		text: 'Замедляет врагов у первого окна.',
		price: 450,
	},
	{
		icon: '💥',
		name: 'Первый удар',
		text: 'Наносит урон всем врагам первой волны.',
		price: 500,
	},
	{
		icon: '👑',
		name: 'Королевский пропуск',
		text: 'Больше валюты за прохождение этажей.',
		price: 900,
	},
]

// Экран бесконечной башни: панель с этажами и магазином слева,
// сама башня — справа. Первый этаж всегда открыт, остальные
// открываются по очереди. Выше текущего — ещё не покорённые этажи.
export default function TowerScreen({ user, onBack, onPlay }: Props) {
	const { progress, loading, error, refresh } = useTower()
	const [tab, setTab] = useState<Tab>('floors')

	const maxFloor = progress?.maxFloor ?? 1
	const coins = progress?.coins ?? 0
	const nextReward = progress?.nextReward ?? towerFloorReward(maxFloor)

	const floors = useMemo(() => {
		const top = maxFloor + FLOORS_ABOVE
		const bottom = Math.max(1, maxFloor - FLOORS_BELOW)
		return Array.from({ length: top - bottom + 1 }, (_, index) => top - index)
	}, [maxFloor])

	return (
		<main className="relative h-[100dvh] w-full overflow-y-auto bg-[url(/ui/background.png)] bg-cover bg-center font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="fixed inset-0 bg-gradient-to-b from-[#05080a]/70 via-[#0a0e12]/40 to-[#05080a]/85" />

			<div className="relative mx-auto flex min-h-full w-full max-w-6xl items-center justify-center gap-6 px-4 py-6 lg:gap-10">
				{/* Левая колонка: логотип, профиль и панель этажей. */}
				<div className="w-full max-w-md shrink-0">
					<Image
						src="/ui/logo.png"
						alt="TowerForce"
						width={330}
						height={180}
						priority
						className="mx-auto mb-4 h-[130px] w-[238px] drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] sm:h-[150px] sm:w-[275px]"
					/>

					<div className="relative border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] sm:p-5">
						<div className="flex flex-col gap-3">
							{user ? <AccountCard user={user} /> : null}

							<div className="flex items-center justify-between gap-2">
								<button
									type="button"
									onClick={onBack}
									className="border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									← В меню
								</button>
								<span
									title="Валюта за прохождение этажей"
									className="border-2 border-[#8a6a1f] bg-[#2a1d0a] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300"
								>
									🪙 {coins}
								</span>
							</div>

							<div className="text-center">
								<h1 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
									Бесконечная башня
								</h1>
								<p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">
									Открыт этаж {maxFloor} · этажей бесконечно
								</p>
							</div>

							{/* Главное действие всегда под рукой: одна кнопка ведёт
								на текущий (самый сложный доступный) этаж. */}
							<button
								type="button"
								onClick={() => onPlay(maxFloor)}
								className="group flex items-center justify-between gap-3 border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-2.5 text-left shadow-[inset_0_1px_0_#a3cf65,0_4px_0_#1d2f0f] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[2px] active:shadow-[0_2px_0_#1d2f0f]"
							>
								<span className="flex flex-col">
									<span className="text-[11px] font-black uppercase tracking-[0.14em] text-lime-50">
										Играть этаж {maxFloor}
									</span>
									<span className="text-[8px] font-bold uppercase tracking-[0.1em] text-lime-200/80">
										15 волн · боссы 10 и 15 · награда +{nextReward} 🪙
									</span>
								</span>
								<span className="text-[18px] leading-none text-lime-300 transition-transform group-hover:translate-x-0.5">
									▶
								</span>
							</button>

							<div className="grid grid-cols-2 gap-1 border-2 border-[#3a2a1a] bg-[#0f0a05]/60 p-1">
								<TabButton active={tab === 'floors'} onClick={() => setTab('floors')}>
									Этажи
								</TabButton>
								<TabButton active={tab === 'shop'} onClick={() => setTab('shop')}>
									Магазин
								</TabButton>
							</div>

							{tab === 'floors' ? (
								<div className="space-y-2">
									{error ? (
										<div className="border-2 border-[#7f2d24] bg-[#2a0f0a]/70 p-3 text-center">
											<p className="text-[10px] font-bold text-red-200">{error}</p>
											<button
												type="button"
												onClick={() => void refresh()}
												className="mt-2 border-2 border-[#79502b] bg-[#21150c] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200 hover:border-amber-400 hover:text-amber-50"
											>
												Повторить
											</button>
										</div>
									) : null}

									{loading && !progress ? (
										<div className="space-y-1.5">
											{Array.from({ length: 6 }, (_, index) => (
												<div
													key={index}
													className="h-12 animate-pulse border-2 border-[#3a2a1a] bg-[#1a1208]/70"
												/>
											))}
										</div>
									) : (
										<div className="relative">
											{/* Крепостной зубец над верхним этажом. */}
											<div className="mx-auto flex w-[86%] justify-between px-1">
												{Array.from({ length: 7 }, (_, index) => (
													<span
														key={index}
														className="h-2.5 w-4 border-2 border-b-0 border-[#4a3a26] bg-[#2a1d0a]"
													/>
												))}
											</div>

											<div className="relative mx-auto w-[92%] border-x-4 border-[#4a3a26] bg-[#171109]/80 px-1.5 pt-1 pb-2 shadow-[inset_0_0_24px_rgba(0,0,0,0.55)]">
												<div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#3a2a1a]/70" />

												<div className="relative z-10 max-h-[40vh] space-y-1 overflow-y-auto pr-1">
													{floors.map((floor) => {
														const completed = floor < maxFloor
														const current = floor === maxFloor
														const unlocked = floor <= maxFloor
														const reward = towerFloorReward(floor)

														return (
															<button
																key={floor}
																type="button"
																disabled={!unlocked}
																onClick={() => onPlay(floor)}
																title={
																	unlocked
																		? `Играть этаж ${floor}`
																		: 'Сначала пройди предыдущий этаж'
																}
																className={`flex w-full items-center gap-2 border-2 px-2 py-1.5 text-left transition-colors ${
																	current
																		? 'border-[#6b8e32] bg-gradient-to-b from-[#3d5c22]/90 to-[#20320f]/90 shadow-[inset_0_0_14px_rgba(163,207,101,0.16)]'
																		: completed
																			? 'border-[#5a6b2f] bg-[#22300f]/80 hover:border-lime-500/60'
																			: 'cursor-not-allowed border-[#3a2a1a] bg-[#161009]/85'
																}`}
															>
																<span
																	className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 text-[10px] font-black ${
																		current
																			? 'border-lime-400/60 bg-[#527c28] text-lime-50'
																			: completed
																				? 'border-[#6b8e32]/50 bg-[#304d19] text-lime-200'
																				: 'border-[#3a2a1a] bg-[#0f0a05] text-[#6b5a3e]'
																	}`}
																>
																	{floor}
																</span>

																<div className="min-w-0 flex-1">
																	<p
																		className={`truncate text-[10px] font-black uppercase tracking-[0.1em] ${
																			unlocked ? 'text-amber-100' : 'text-[#6b5a3e]'
																		}`}
																	>
																		Этаж {floor}
																	</p>
																	<p className="truncate text-[8px] font-bold uppercase tracking-[0.08em] text-[#8a7340]">
																		{current
																			? `15 волн · боссы 10 и 15 · +${reward} 🪙`
																			: completed
																				? 'Пройден'
																				: 'Закрыт — пройди предыдущий этаж'}
																	</p>
																</div>

																{unlocked ? (
																	<span
																		className={`shrink-0 border-2 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
																			current
																				? 'border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65]'
																				: 'border-[#79502b] bg-[#21150c] text-amber-200'
																		}`}
																	>
																		{current ? 'Играть' : 'Повторить'}
																	</span>
																) : (
																	<span className="shrink-0 border border-[#3a2a1a] bg-[#0f0a05] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#5c4a32]">
																		Закрыт
																	</span>
																)}
															</button>
														)
													})}
												</div>
											</div>

											<p className="mt-1 text-center text-[8px] font-bold uppercase tracking-[0.16em] text-[#6b5a3e]">
												Выше — новые этажи, ниже — уже пройденные
											</p>
										</div>
									)}
								</div>
							) : (
								<div className="space-y-2">
									<div className="border-2 border-[#3a2a1a] bg-[#161009]/85 p-3 text-center">
										<p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
											Магазин готовится
										</p>
										<p className="mt-1 text-[9px] font-bold leading-snug text-[#8a7340]">
											Покупки появятся позже. Валюту за этажи уже можно копить.
										</p>
									</div>

									<div className="max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
										{SHOP_ITEMS.map((item) => (
											<div
												key={item.name}
												className="flex gap-2 border-2 border-[#3a2a1a] bg-[#161009]/85 p-2 opacity-80"
											>
												<span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#3a2a1a] bg-[#0f0a05] text-[16px]">
													{item.icon}
												</span>
												<div className="min-w-0 flex-1">
													<p className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-amber-100">
														{item.name}
													</p>
													<p className="text-[8px] font-bold leading-snug text-[#8a7340]">
														{item.text}
													</p>
												</div>
												<button
													type="button"
													disabled
													className="h-fit shrink-0 cursor-not-allowed border border-[#3a2a1a] bg-[#0f0a05] px-1.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#5c4a32]"
												>
													{item.price} 🪙
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Правая колонка: сама башня. На узких экранах прячется,
					чтобы панель занимала весь экран. */}
				<div className="relative hidden flex-1 items-end justify-center lg:flex">
					<div className="pointer-events-none absolute bottom-[8%] left-1/2 h-[55%] w-[80%] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
					<div className="relative flex flex-col items-center">
						<Image
							src="/ui/castle.png"
							alt="Бесконечная башня TowerForce"
							width={1024}
							height={1536}
							priority
							className="h-[78vh] w-auto object-contain drop-shadow-[0_18px_50px_rgba(0,0,0,0.75)]"
						/>
						<span className="mt-2 border-2 border-[#8a6a1f] bg-[#21150c]/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
							Покорено этажей: {maxFloor - 1}
						</span>
					</div>
				</div>
			</div>
		</main>
	)
}

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean
	onClick: () => void
	children: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`border-2 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-colors ${
				active
					? 'border-[#8a6a1f] bg-gradient-to-b from-[#3a2a12] to-[#21150c] text-amber-200'
					: 'border-transparent bg-[#0f0a05]/40 text-[#6b5a3e] hover:text-amber-300'
			}`}
		>
			{children}
		</button>
	)
}
