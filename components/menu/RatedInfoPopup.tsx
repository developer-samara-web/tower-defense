import {
	PAR_WAVE,
	RATING_DECAY,
	RATING_MAPS_LIMIT,
	STAR_EXPONENT,
} from '@/lib/map-points'

type Props = {
	onClose: () => void
	onAdventures: () => void
}

const PCT = (value: number) => `${Math.round(value * 100)}%`

// Рассказ про рейтинг показываем один раз — сразу после обучения. Числа
// берутся из lib/map-points: текст не должен разойтись с формулой, когда
// баланс поправят.
export default function RatedInfoPopup({ onClose, onAdventures }: Props) {
	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05080a]/85 px-4 font-mono">
			<section className="w-[min(560px,94vw)] border-2 border-[#4a3d8f] bg-gradient-to-b from-[#1a1240]/95 to-[#0f0a05]/95 px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.8)]">
				<h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-indigo-300">
					Как устроен рейтинг
				</h2>
				<p className="mt-1 text-[10px] font-bold leading-snug text-amber-100">
					Обучение пройдено. Дальше карты делятся на обычные и рейтинговые —
					вторые двигают место в общем топе.
				</p>

				<ul className="mt-3 space-y-2">
					{FACTS.map((fact) => (
						<li key={fact.title} className="flex gap-2">
							<span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center border border-[#4a3d8f] bg-[#2a2f74] text-[9px] font-black text-indigo-100">
								{fact.mark}
							</span>
							<span className="min-w-0">
								<span className="block text-[10px] font-black uppercase tracking-[0.1em] text-amber-300">
									{fact.title}
								</span>
								<span className="block text-[10px] font-bold leading-snug text-[#e2c8a0]">
									{fact.text}
								</span>
							</span>
						</li>
					))}
				</ul>

				<div className="mt-4 flex flex-wrap items-center justify-end gap-2">
					<button
						type="button"
						onClick={onAdventures}
						className="border-2 border-[#4a3d8f] bg-gradient-to-b from-[#5b3fa8] to-[#2a2f74] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-50 transition-colors hover:from-[#6d4fc0] hover:to-[#35398c]"
					>
						Открыть приключения
					</button>
					<button
						type="button"
						onClick={onClose}
						className="border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
					>
						Понятно
					</button>
				</div>
			</section>
		</div>
	)
}

const FACTS = [
	{
		mark: '★',
		title: 'Звёзды сложности',
		text: `У каждой карты есть звёзды от 1 до 10: их считает её давление атаки минус то, что карта даёт обороне. Очки забега растут как звёзды в степени ${STAR_EXPONENT}.`,
	},
	{
		mark: '≈',
		title: 'Глубина волн',
		text: `Очки прибавляются за каждую удержанную волну, но после ${PAR_WAVE} волн прирост почти останавливается: забег считается практически полным.`,
	},
	{
		mark: '⌂',
		title: 'Целость замка',
		text: `Финальный множитель зависит от того, сколько жизней замка осталось: целая крепость даёт на ${PCT(0.4)} больше очков, чем полумёртвая.`,
	},
	{
		mark: '1',
		title: 'Топ одной карты',
		text: 'На карте учитывается только лучший результат. Повторные забеги двигают число попыток, но не строку топа.',
	},
	{
		mark: 'Σ',
		title: 'Общий рейтинг',
		text: `Рейтинг — сумма лучших очков по разным картам: каждая следующая весит в ${RATING_DECAY} раза меньше предыдущей, в зачёт идут топ-${RATING_MAPS_LIMIT} карт.`,
	},
	{
		mark: '⚑',
		title: 'Обычные карты',
		text: 'Свои карты, случайные забеги и песочница редактора рейтинг не двигают — у них есть только собственный топ.',
	},
]
