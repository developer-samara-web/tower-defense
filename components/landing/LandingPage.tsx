import Image from 'next/image'
import Link from 'next/link'

import KeyChip from '@/components/ui/KeyChip'
import LandingPlayButton from './LandingPlayButton'

// Лендинг собран из полноэкранных секций: каждая отвечает за одну часть игры,
// а не за маркетинговый блок. Порядок повторяет путь игрока — от первого боя
// до рейтинга, библиотеки карт и редактора.
const NAV = [
	{ href: '#about', label: 'Игра' },
	{ href: '#towers', label: 'Башни' },
	{ href: '#waves', label: 'Волны' },
	{ href: '#maps', label: 'Карты' },
	{ href: '#rating', label: 'Рейтинг' },
	{ href: '#controls', label: 'Управление' },
	{ href: '/updates', label: 'Обновления' },
]

const NAV_LINK =
	'text-[10px] font-black uppercase tracking-[0.16em] text-[#b5a17b] transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const HEADING = 'font-black uppercase tracking-[0.14em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]'
const PANEL =
	'border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(74,55,35,0.18)]'
const CHIP =
	'inline-flex items-center gap-1.5 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#c9b491]'
const SECTION = 'relative scroll-mt-14 border-t border-[#3a2a1a]/80 px-4 py-16 sm:py-20'
const PRIMARY_BUTTON =
	'inline-flex items-center justify-center gap-2 border-2 border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#f5e6c8] shadow-[0_5px_0_#3a1d0a,0_0_24px_rgba(250,204,21,0.15)] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] active:translate-y-[3px] active:shadow-[0_2px_0_#3a1d0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
const GHOST_BUTTON =
	'inline-flex items-center justify-center gap-2 border-2 border-[#79502b] bg-[#21150c] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-amber-200 shadow-[0_4px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_2px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

type IconName =
	| 'tutorial'
	| 'battle'
	| 'rating'
	| 'library'
	| 'editor'
	| 'adventure'
	| 'profile'
	| 'top'

const ICON_PATHS: Record<IconName, string[]> = {
	tutorial: ['M12 3l7 4v10l-7 4-7-4V7l7-4z', 'M12 3v18', 'M8 9h8'],
	battle: ['M5 19L19 5', 'M5 5l14 14', 'M15 5h4v4', 'M5 15v4h4'],
	rating: ['M12 3l2.7 5.7 6.3.9-4.6 4.3 1.1 6.1-5.5-3-5.5 3 1.1-6.1L3 9.6l6.3-.9L12 3z'],
	library: ['M4 5h16v14H4z', 'M8 5v14', 'M12 5v14', 'M16 5v14'],
	editor: ['M4 20l4-1L18 9l-3-3L5 16l-1 4z', 'M14 6l3 3', 'M4 20h16'],
	adventure: ['M4 18c4-8 12-8 16 0', 'M7 18l3-6', 'M17 18l-3-6', 'M12 4v3'],
	profile: ['M12 12a4 4 0 100-8 4 4 0 000 8z', 'M4 21c0-4 4-6 8-6s8 2 8 6'],
	top: ['M5 20V10h4v10', 'M10 20V4h4v16', 'M15 20v-7h4v7'],
}

const FEATURES: Array<{
	icon: IconName
	title: string
	text: string
	tag: string
}> = [
	{
		icon: 'tutorial',
		title: 'Обучение',
		tag: '5 волн',
		text: 'Фиксированная карта и подсказки: поставить башню, улучшить, отправить постройку в очередь. Урок не пишет в рейтинг и не трогает сохранённые забеги.',
	},
	{
		icon: 'battle',
		title: 'Обычная игра',
		tag: 'свободный забег',
		text: 'Случайная карта по сиду или своя из библиотеки. Играй в своё удовольствие: результат попадёт в личную статистику, а не в общий рейтинг.',
	},
	{
		icon: 'rating',
		title: 'Рейтинговая игра',
		tag: '10 карт',
		text: 'Каталог рейтинговых карт со звёздами сложности. Забег идёт по id карты, а очки двигают место в общем топе игроков.',
	},
	{
		icon: 'library',
		title: 'Библиотека карт',
		tag: 'сид + превью',
		text: 'Рейтинговые, обычные и свои карты. У каждой — превью, размер поля, сложность, статус модерации и собственный топ результатов.',
	},
	{
		icon: 'editor',
		title: 'Редактор карт',
		tag: 'свои поля',
		text: 'Замок, казармы, дороги, реки и лес. Настрой состав волн, проверь маршруты и запусти карту в бою. Отправить её на проверку можно из библиотеки.',
	},
	{
		icon: 'adventure',
		title: 'Приключения',
		tag: 'тропа из 10 карт',
		text: 'Компендиум ведёт по десяти картам от мягкой к самой злой. За каждую пройденную — приз, за всю тропу — главный.',
	},
	{
		icon: 'profile',
		title: 'Профиль героя',
		tag: 'аватар · рамка · титул',
		text: 'Портреты, рамки и титулы с живым предпросмотром. Рядом — статистика: игры, лучшая волна, рекорд и история забегов.',
	},
	{
		icon: 'top',
		title: 'Топ игроков',
		tag: 'очки рейтинга',
		text: 'Общая таблица лидеров по очкам рейтинга и отдельный топ каждой карты: лучший забег, волна и число попыток.',
	},
]

const TOWERS = [
	{
		name: 'Земля',
		role: 'Фундамент обороны',
		image: '/game/towers/earth-5.png',
		cost: '40',
		stats: [
			['Урон', '45'],
			['Перезарядка', '1,10 с'],
			['Радиус', '140'],
		],
		text: 'Самая доступная башня. Держит ранние волны и закрывает прямые участки дороги, пока копится золото на стихии посерьёзнее.',
		accent: 'text-amber-300',
		edge: 'border-[#79502b]',
	},
	{
		name: 'Лёд',
		role: 'Контроль',
		image: '/game/towers/ice-5.png',
		cost: '80',
		stats: [
			['Урон', '10'],
			['Перезарядка', '0,60 с'],
			['Радиус', '140'],
		],
		text: 'Замедляет цель на 50%. На 3–4 уровнях мороз крепчает до −70%, а с максимального уровня залп накрывает сразу три цели.',
		accent: 'text-sky-300',
		edge: 'border-[#3f5f8f]',
	},
	{
		name: 'Огонь',
		role: 'Урон по площади',
		image: '/game/towers/fire-5.png',
		cost: '100',
		stats: [
			['Урон', '55'],
			['Перезарядка', '0,90 с'],
			['Радиус', '130'],
		],
		text: 'Бьёт по области вокруг цели. С 3 уровня поджигает врагов на 10% их максимального здоровья в секунду — одинаково больно и свите, и боссу.',
		accent: 'text-orange-300',
		edge: 'border-[#8f4a2a]',
	},
]

const LEVEL_PERKS = [
	{ level: '2', text: 'Залп по двум целям' },
	{ level: '3', text: 'Лёд: −60% скорости. Огонь: поджог 10% HP/с' },
	{ level: '4', text: 'Лёд: −70% скорости' },
	{ level: '5', text: 'Залп по трём целям и золотая пластина ранга' },
]

const ENEMIES = [
	{
		name: 'Разведчик',
		image: '/game/enemies/average.png',
		hp: '55',
		speed: '77',
		text: 'Рядовой поток. Идёт ровно, проверяет, хватает ли урона на длинной дороге.',
	},
	{
		name: 'Громила',
		image: '/game/enemies/big.png',
		hp: '130',
		speed: '48',
		text: 'Толстый и медленный. Замедление и поджог работают по нему лучше всего.',
	},
	{
		name: 'Спринтер',
		image: '/game/enemies/small.png',
		hp: '38',
		speed: '121',
		text: 'Самый быстрый. Проскакивает мимо одиночной башни, если не поставить её у поворота.',
	},
	{
		name: 'Босс',
		image: '/game/enemies/boss.png',
		hp: '460',
		speed: '37',
		text: 'Замыкает каждую пятую волну. Один прорыв стоит нескольких жизней замка.',
	},
]

const CARD_FACTS = [
	{ mark: 'C', title: 'Обычное', text: 'Урон, радиус или перезарядка. Выпадает чаще всего и всегда полезно.' },
	{ mark: 'B', title: 'Редкое', text: 'Усиленные статы и первые модификаторы: крит и поджог.' },
	{ mark: 'A', title: 'Эпическое', text: 'Цепь по соседним врагам и сильный поджог. Гарантия раз в 10 волн.' },
	{ mark: 'S', title: 'Легендарное', text: 'Добивание раненых и цепь на две цели. Гарантия раз в 30 волн.' },
]

const CARD_EFFECTS = [
	'Урон +%',
	'Радиус +%',
	'Перезарядка −%',
	'Крит: двойной урон',
	'Поджог: урон в секунду',
	'Цепь по соседям',
	'Добивание раненых',
]

const ADVENTURE_MAPS = [
	'Элементальный коридор',
	'Зимний Вал',
	'Самоцветная тропа',
	'Речной остров',
	'Лесной лагерь',
	'Полки на равнине',
	'Четыре ворот',
	'Горный серпантин',
	'Пепельный рубеж',
	'Пепельный приговор',
]

const CONTROLS = [
	{ keys: ['Q', 'W', 'E'], text: 'выбрать башню' },
	{ keys: ['ЛКМ'], text: 'поставить башню' },
	{ keys: ['ПКМ'], text: 'очередь стройки' },
	{ keys: ['U'], text: 'улучшить выбранные' },
	{ keys: ['1', '2', '3'], text: 'карта улучшения' },
	{ keys: ['Стрелки'], text: 'движение камеры' },
	{ keys: ['Колесо'], text: 'зум' },
	{ keys: ['Esc'], text: 'снять выбор' },
	{ keys: ['Пробел'], text: 'начать волну' },
	{ keys: ['R'], text: 'рестарт после поражения' },
]

// Ускорение, пауза и состав волны живут в HUD: это кнопки, а не клавиши.
const HUD_BUTTONS = [
	'×2 / ×3 — ускорение боя по кругу',
	'Пауза — остановить волну и стройку',
	'Состав волны — кто идёт и сколько осталось',
	'Продажа — вернуть 30% вложенного золота',
]

function FeatureIcon({ name }: { name: IconName }) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className="h-5 w-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="square"
			strokeLinejoin="miter"
		>
			{ICON_PATHS[name].map((path) => (
				<path key={path} d={path} />
			))}
		</svg>
	)
}

function SectionHead({ index, title, lead }: { index: string; title: string; lead: string }) {
	return (
		<div className="max-w-3xl">
			<span className="text-[10px] font-black uppercase tracking-[0.34em] text-[#8a7340]">{index}</span>
			<h2 className={`mt-2 text-2xl sm:text-3xl ${HEADING}`}>{title}</h2>
			<p className="mt-3 text-[13px] font-bold leading-relaxed text-[#b5a17b] sm:text-sm">{lead}</p>
		</div>
	)
}

export default function LandingPage() {
	return (
		<main className="relative w-full overflow-x-clip bg-[url(/ui/background.png)] bg-cover bg-center bg-fixed font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="fixed inset-0 z-0 bg-gradient-to-b from-[#05080a]/88 via-[#0a0e12]/82 to-[#05080a]/92" />

			{/* Верхняя навигация: якоря по экранам и та же кнопка входа, что в герое.
			    Фон не заливаем: мини-логотип и ссылки должны лежать прямо на фоне. */}
			<header className="sticky top-0 z-50 bg-gradient-to-b from-black/90 via-black/45 to-transparent">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
					<a href="#top" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
						<Image src="/ui/logo-mini.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
						<span className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
							TowerForce
						</span>
					</a>

					<nav aria-label="Разделы лендинга" className="hidden items-center gap-4 lg:flex">
						{NAV.map((item) =>
							item.href.startsWith('#') ? (
								<a key={item.href} href={item.href} className={NAV_LINK}>
									{item.label}
								</a>
							) : (
								<Link key={item.href} href={item.href} className={NAV_LINK}>
									{item.label}
								</Link>
							),
						)}
					</nav>

					<LandingPlayButton className="shrink-0 border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400">
						Играть
					</LandingPlayButton>
				</div>
			</header>

			<div className="relative z-10">
				{/* Экран 1 — герой. */}
				<section
					id="top"
					className="relative flex min-h-[calc(100dvh-56px)] scroll-mt-14 items-center px-4 py-12"
				>
					<div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
						<Image
							src="/ui/logo.png"
							alt="TowerForce"
							width={330}
							height={180}
							priority
							className="h-[150px] w-[275px] object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)] sm:h-[180px] sm:w-[330px]"
						/>

						<span className="mt-2 border border-[#5c3a1a] bg-[#0f0a05]/70 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-[#c9b491]">
							Браузерная tower defense
						</span>

						<h1 className="mt-4 text-4xl font-black uppercase tracking-[0.12em] text-amber-300 drop-shadow-[0_4px_0_#5c2d0e] sm:text-6xl">
							TowerForce
						</h1>

						<p className="mt-5 max-w-xl text-[13px] font-bold leading-relaxed text-[#c9b491] sm:text-sm">
							Строй башни трёх стихий, держи волны врагов и защити замок.
							Прокачивай оборону, собирай карты улучшений, открывай приключения
							и поднимайся в общем рейтинге.
						</p>

						<div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
							<LandingPlayButton className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
								Играть
							</LandingPlayButton>
							<a href="#about" className={`${GHOST_BUTTON} w-full sm:w-auto`}>
								Возможности
							</a>
						</div>

						<div className="mt-9 flex flex-wrap justify-center gap-2">
							<span className={CHIP}>3 стихии башен</span>
							<span className={CHIP}>5 уровней прокачки</span>
							<span className={CHIP}>4 типа врагов</span>
							<span className={CHIP}>10 карт приключений</span>
						</div>

						<div className="mt-10 flex items-end justify-center gap-3 sm:gap-6">
							{TOWERS.map((tower) => (
								<Image
									key={tower.name}
									src={tower.image}
									alt={tower.name}
									width={96}
									height={96}
									className="h-14 w-14 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)] [image-rendering:pixelated] sm:h-20 sm:w-20"
								/>
							))}
						</div>

						<a
							href="#about"
							className="mt-10 text-[9px] font-black uppercase tracking-[0.28em] text-[#8a7340] transition-colors hover:text-amber-300"
						>
							Листай вниз ↓
						</a>
					</div>
				</section>

				{/* Экран 2 — что это за игра и все режимы. */}
				<section id="about" className={`${SECTION} flex min-h-[100dvh] items-center`}>
					<div className="mx-auto w-full max-w-6xl">
						<SectionHead
							index="01 · Игра"
							title="Оборона, которая начинается с одной башни"
							lead="Дороги ведут к замку, враги идут волнами, золото капает за убийства и удержанные волны, а опыт открывает карты улучшений. Проигрыш — когда у замка не осталось жизней."
						/>

						<div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
							<ol className="grid gap-3 sm:grid-cols-2">
								{RUN_STEPS.map((step, index) => (
									<li key={step.title} className={`${PANEL} flex gap-3 p-4`}>
										<span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#6b4c1f] bg-[#2a1d0a] text-[11px] font-black text-amber-300">
											{index + 1}
										</span>
										<span className="min-w-0">
											<span className="block text-[11px] font-black uppercase tracking-[0.1em] text-amber-200">
												{step.title}
											</span>
											<span className="mt-1 block text-[11px] font-bold leading-snug text-[#b5a17b]">
												{step.text}
											</span>
										</span>
									</li>
								))}
							</ol>

							<div className={`${PANEL} flex flex-col items-center justify-center gap-4 p-5 text-center`}>
								<Image
									src="/game/buildings/castle.png"
									alt="Замок"
									width={140}
									height={140}
									className="h-28 w-28 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.65)] [image-rendering:pixelated]"
								/>
								<p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
									Замок — единственная точка, которую нельзя потерять
								</p>
								<p className="text-[10px] font-bold leading-relaxed text-[#b5a17b]">
									20 жизней на старте и 200 золота. Каждый прорвавшийся враг
									отнимает жизнь, поэтому дорога важнее отдельной башни.
								</p>
								<div className="flex flex-wrap justify-center gap-1.5">
									<span className={CHIP}>Автосохранение</span>
									<span className={CHIP}>Продолжение забега</span>
								</div>
							</div>
						</div>

						<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{FEATURES.map((feature) => (
								<article key={feature.title} className={`${PANEL} flex flex-col gap-2 p-4`}>
									<div className="flex items-center justify-between gap-2">
										<span className="flex h-8 w-8 items-center justify-center border border-[#5c3a1a] bg-[#0f0a05] text-amber-300">
											<FeatureIcon name={feature.icon} />
										</span>
										<span className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
											{feature.tag}
										</span>
									</div>
									<h3 className="text-[12px] font-black uppercase tracking-[0.1em] text-amber-200">
										{feature.title}
									</h3>
									<p className="text-[10px] font-bold leading-relaxed text-[#b5a17b]">{feature.text}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* Экран 3 — башни и уровни. */}
				<section id="towers" className={`${SECTION} flex min-h-[100dvh] items-center`}>
					<div className="mx-auto w-full max-w-6xl">
						<SectionHead
							index="02 · Башни"
							title="Три стихии, пять уровней, разные роли"
							lead="Башни не заменяют друг друга: земля держит поток, лёд растягивает его во времени, огонь снимает толпу. Прокачка растит статы и добавляет свойства, которые остаются с башней навсегда."
						/>

						<div className="mt-8 grid gap-4 md:grid-cols-3">
							{TOWERS.map((tower) => (
								<article key={tower.name} className={`${PANEL} ${tower.edge} flex flex-col p-5`}>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7340]">
												{tower.role}
											</p>
											<h3 className={`mt-1 text-xl font-black uppercase tracking-[0.12em] ${tower.accent}`}>
												{tower.name}
											</h3>
										</div>
										<Image
											src={tower.image}
											alt={tower.name}
											width={80}
											height={80}
											className="h-16 w-16 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] [image-rendering:pixelated]"
										/>
									</div>

									<p className="mt-3 flex items-baseline gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#c9b491]">
										<span className="text-lg text-amber-300">{tower.cost}</span> золота
									</p>

									<dl className="mt-3 grid grid-cols-3 gap-1.5">
										{tower.stats.map(([label, value]) => (
											<div key={label} className="border border-[#3a2a1a] bg-[#0f0a05]/70 px-1.5 py-1 text-center">
												<dt className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8a7340]">{label}</dt>
												<dd className="mt-0.5 text-[12px] font-black text-amber-100">{value}</dd>
											</div>
										))}
									</dl>

									<p className="mt-4 text-[11px] font-bold leading-relaxed text-[#b5a17b]">{tower.text}</p>
								</article>
							))}
						</div>

						<div className={`${PANEL} mt-4 p-5`}>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h3 className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-300">
									Что даёт каждый уровень
								</h3>
								<span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
									улучшение — клавиша U
								</span>
							</div>
							<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
								{LEVEL_PERKS.map((perk) => (
									<div key={perk.level} className="flex gap-2 border border-[#3a2a1a] bg-[#0f0a05]/70 p-2.5">
										<span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#6b4c1f] bg-[#2a1d0a] text-[10px] font-black text-amber-300">
											{perk.level}
										</span>
										<span className="text-[10px] font-bold leading-snug text-[#c9b491]">{perk.text}</span>
									</div>
								))}
							</div>
							<p className="mt-3 text-[10px] font-bold leading-relaxed text-[#8a7340]">
								У подножия башни — пластина ранга: ромбы показывают уровень, бронза сменяется сталью,
								а на пятом уровне загорается золото. Продажа возвращает 30% вложенного золота.
							</p>
						</div>
					</div>
				</section>

				{/* Экран 4 — враги, волны и карточки улучшений. */}
				<section id="waves" className={`${SECTION} flex min-h-[100dvh] items-center`}>
					<div className="mx-auto w-full max-w-6xl">
						<SectionHead
							index="03 · Волны"
							title="Волны, которых хватает на длинный забег"
							lead="Здоровье врагов растёт с каждой волной, скорость — медленнее и с потолком, поэтому поздние волны не превращаются в гонку за пикселями. Каждую пятую волну замыкает босс."
						/>

						<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{ENEMIES.map((enemy) => (
								<article key={enemy.name} className={`${PANEL} flex flex-col items-center p-4 text-center`}>
									<Image
										src={enemy.image}
										alt={enemy.name}
										width={72}
										height={72}
										className="h-14 w-14 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] [image-rendering:pixelated]"
									/>
									<h3 className="mt-2 text-[12px] font-black uppercase tracking-[0.1em] text-amber-200">
										{enemy.name}
									</h3>
									<div className="mt-1.5 flex gap-1.5">
										<span className={CHIP}>{enemy.hp} HP</span>
										<span className={CHIP}>скорость {enemy.speed}</span>
									</div>
									<p className="mt-2 text-[10px] font-bold leading-relaxed text-[#b5a17b]">{enemy.text}</p>
								</article>
							))}
						</div>

						<div className="mt-5 grid gap-4 lg:grid-cols-2">
							<div className={`${PANEL} p-5`}>
								<h3 className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-300">
									Ритм боя
								</h3>
								<ul className="mt-3 space-y-2">
									{WAVE_FACTS.map((fact) => (
										<li key={fact} className="flex gap-2 text-[11px] font-bold leading-snug text-[#c9b491]">
											<span className="mt-[5px] h-1.5 w-1.5 shrink-0 bg-amber-500" />
											{fact}
										</li>
									))}
								</ul>
							</div>

							<div className={`${PANEL} p-5`}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<h3 className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-300">
										Карточки улучшений
									</h3>
									<span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
										клавиши 1–3
									</span>
								</div>
								<p className="mt-2 text-[11px] font-bold leading-relaxed text-[#b5a17b]">
									Опыт заполняет шкалу — игра останавливается и предлагает три карты.
									Выбирай одну: усиления складываются и действуют до конца забега.
								</p>

								<div className="mt-3 grid grid-cols-2 gap-1.5">
									{CARD_FACTS.map((fact) => (
										<div key={fact.mark} className="border border-[#3a2a1a] bg-[#0f0a05]/70 p-2">
											<span className="text-[10px] font-black text-amber-300">{fact.mark}</span>
											<span className="ml-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#c9b491]">
												{fact.title}
											</span>
											<p className="mt-1 text-[9px] font-bold leading-snug text-[#8a7340]">{fact.text}</p>
										</div>
									))}
								</div>

								<div className="mt-3 flex flex-wrap gap-1.5">
									{CARD_EFFECTS.map((effect) => (
										<span key={effect} className={CHIP}>
											{effect}
										</span>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Экран 5 — карты, редактор и приключения. */}
				<section id="maps" className={`${SECTION} flex min-h-[100dvh] items-center`}>
					<div className="mx-auto w-full max-w-6xl">
						<SectionHead
							index="04 · Карты"
							title="Рейтинговые карты, своя библиотека и редактор"
							lead="У каждой карты есть сид, размер поля и превью. Рейтинговые поля собраны по каталогу, обычные генерируются по сиду, а своё поле можно нарисовать в редакторе и отправить на проверку из библиотеки."
						/>

						<div className="mt-8 grid gap-4 lg:grid-cols-3">
							{MAP_PANELS.map((panel) => (
								<article key={panel.title} className={`${PANEL} flex flex-col p-5`}>
									<div className="flex items-center justify-between gap-2">
										<h3 className="text-[12px] font-black uppercase tracking-[0.12em] text-amber-200">
											{panel.title}
										</h3>
										<span className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
											{panel.tag}
										</span>
									</div>
									<p className="mt-2 text-[11px] font-bold leading-relaxed text-[#b5a17b]">{panel.text}</p>
									<ul className="mt-3 space-y-1.5">
										{panel.points.map((point) => (
											<li key={point} className="flex gap-2 text-[10px] font-bold leading-snug text-[#c9b491]">
												<span className="mt-[4px] h-1.5 w-1.5 shrink-0 bg-amber-500" />
												{point}
											</li>
										))}
									</ul>
								</article>
							))}
						</div>

						<div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
							<div className={`${PANEL} p-5`}>
								<h3 className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-300">
									Тропа приключений
								</h3>
								<p className="mt-2 text-[11px] font-bold leading-relaxed text-[#b5a17b]">
									Десять карт идут от мягкой к самой злой. Карта засчитывается, если замок удержал
									25 волн; за каждую дают приз, за всю тропу — главный.
								</p>
								<ol className="mt-3 grid gap-1 sm:grid-cols-2">
									{ADVENTURE_MAPS.map((name, index) => (
										<li
											key={name}
											className="flex items-center gap-2 border border-[#3a2a1a] bg-[#0f0a05]/60 px-2 py-1.5"
										>
											<span className="w-4 text-[9px] font-black tabular-nums text-[#8a7340]">
												{index + 1}
											</span>
											<span className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.06em] text-[#c9b491]">
												{name}
											</span>
										</li>
									))}
								</ol>
							</div>

							<div className={`${PANEL} p-5`}>
								<h3 className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-300">
									Редактор в деталях
								</h3>
								<p className="mt-2 text-[11px] font-bold leading-relaxed text-[#b5a17b]">
									Поле собирается кистями, а казармы задают состав волн. Перед публикацией
									редактор сам проверяет, что карта проходима.
								</p>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{EDITOR_TOOLS.map((tool) => (
										<span key={tool} className={CHIP}>
											{tool}
										</span>
									))}
								</div>
								<ul className="mt-3 space-y-1.5">
									{EDITOR_POINTS.map((point) => (
										<li key={point} className="flex gap-2 text-[10px] font-bold leading-snug text-[#c9b491]">
											<span className="mt-[4px] h-1.5 w-1.5 shrink-0 bg-amber-500" />
											{point}
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</section>

				{/* Экран 6 — рейтинг, профиль и топ. */}
				<section id="rating" className={`${SECTION} flex min-h-[100dvh] items-center`}>
					<div className="mx-auto w-full max-w-6xl">
						<SectionHead
							index="05 · Рейтинг"
							title="Очки считает карта, а не обещания"
							lead="У рейтинговой карты есть звёзды сложности. Очки забега зависят от удержанных волн и целости замка, а общий рейтинг — взвешенная сумма лучших результатов по разным картам."
						/>

						<div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
							<div className="grid gap-3 sm:grid-cols-2">
								{RATING_FACTS.map((fact) => (
									<article key={fact.title} className={`${PANEL} p-4`}>
										<span className="flex h-8 w-8 items-center justify-center border border-[#4a3d8f] bg-[#2a2f74] text-[11px] font-black text-indigo-100">
											{fact.mark}
										</span>
										<h3 className="mt-2 text-[11px] font-black uppercase tracking-[0.1em] text-amber-300">
											{fact.title}
										</h3>
										<p className="mt-1 text-[10px] font-bold leading-relaxed text-[#b5a17b]">{fact.text}</p>
									</article>
								))}
							</div>

							<div className={`${PANEL} flex flex-col gap-3 p-5`}>
								<h3 className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-300">
									Профиль и топ
								</h3>
								<ul className="space-y-2">
									{PROFILE_POINTS.map((point) => (
										<li key={point} className="flex gap-2 text-[10px] font-bold leading-snug text-[#c9b491]">
											<span className="mt-[4px] h-1.5 w-1.5 shrink-0 bg-amber-500" />
											{point}
										</li>
									))}
								</ul>
								<Link
									href="/leaderboard"
									className="mt-auto inline-flex items-center justify-center border-2 border-[#4a3d8f] bg-gradient-to-b from-[#5b3fa8] to-[#2a2f74] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-50 transition-colors hover:from-[#6d4fc0] hover:to-[#35398c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
								>
									Открыть топ игроков
								</Link>
							</div>
						</div>

						<p className="mt-4 border border-[#3a2a1a] bg-[#0f0a05]/60 px-4 py-3 text-[10px] font-bold leading-relaxed text-[#8a7340]">
							Свои карты, случайные забеги и песочница редактора общий рейтинг не двигают:
							у них есть только собственный топ. Так рейтинг остаётся сравнением игроков
							на одинаковых полях.
						</p>
					</div>
				</section>

				{/* Экран 7 — управление и финальный призыв. */}
				<section id="controls" className={`${SECTION} flex min-h-[100dvh] items-center`}>
					<div className="mx-auto w-full max-w-6xl">
						<SectionHead
							index="06 · Управление"
							title="Всё делается с клавиатуры и мыши"
							lead="Башни выбираются буквами, цифры отданы карточкам улучшения, а камера ездит стрелками. Подсказки с клавишами есть прямо на кнопках интерфейса."
						/>

						<div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{CONTROLS.map((control) => (
								<div
									key={control.text}
									className={`${PANEL} flex items-center gap-2 px-3 py-2.5`}
								>
									<span className="flex shrink-0 gap-1">
										{control.keys.map((key) => (
											<KeyChip key={key} label={key} />
										))}
									</span>
									<span className="min-w-0 text-[10px] font-black uppercase tracking-[0.08em] text-[#c9b491]">
										{control.text}
									</span>
								</div>
							))}
						</div>

						<div className={`${PANEL} mt-3 p-4`}>
							<h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
								Кнопки в бою
							</h3>
							<ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
								{HUD_BUTTONS.map((item) => (
									<li key={item} className="flex gap-2 text-[10px] font-bold leading-snug text-[#c9b491]">
										<span className="mt-[4px] h-1.5 w-1.5 shrink-0 bg-amber-500" />
										{item}
									</li>
								))}
							</ul>
						</div>

						<div className={`${PANEL} mt-6 flex flex-col items-center gap-4 p-6 text-center sm:p-8`}>
							<Image
								src="/game/buildings/castle.png"
								alt=""
								width={160}
								height={140}
								className="h-24 w-auto object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.65)] [image-rendering:pixelated]"
							/>
							<h2 className={`text-xl sm:text-2xl ${HEADING}`}>Замок ждёт защитника</h2>
							<p className="max-w-xl text-[12px] font-bold leading-relaxed text-[#b5a17b]">
								Обучение займёт пять волн. Дальше — обычные и рейтинговые карты,
								приключения, библиотека и редактор. Забег сохраняется сам:
								можно закрыть вкладку и вернуться к той же волне.
							</p>
							<div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
								<LandingPlayButton className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
									Начать играть
								</LandingPlayButton>
								<Link href="/auth" className={`${GHOST_BUTTON} w-full sm:w-auto`}>
									Войти в аккаунт
								</Link>
							</div>
							<p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8a7340]">
								Бесплатно в браузере · без установки
							</p>
						</div>

						<footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-[#3a2a1a]/80 pt-4 text-[9px] font-black uppercase tracking-[0.18em] text-[#8a7340] sm:flex-row">
							<span>© TowerForce</span>
							<span className="flex items-center gap-3">
								<a href="#top" className="transition-colors hover:text-amber-300">
									Наверх ↑
								</a>
								<Link href="/updates" className="transition-colors hover:text-amber-300">
									Обновления
								</Link>
								<Link href="/leaderboard" className="transition-colors hover:text-amber-300">
									Топ
								</Link>
							</span>
						</footer>
					</div>
				</section>
			</div>
		</main>
	)
}

const RUN_STEPS = [
	{
		title: 'Выбери режим',
		text: 'Обучение, обычная игра, рейтинговая карта, библиотека или тропа приключений.',
	},
	{
		title: 'Построй оборону',
		text: 'Три стихии, очередь стройки правой кнопкой и продажа ненужных башен.',
	},
	{
		title: 'Держи волны',
		text: 'Пауза, ускорение ×2 и ×3, панель состава волны и миникарта.',
	},
	{
		title: 'Прокачивайся',
		text: 'Уровни башен, перки и карточки улучшений, которые складываются до конца забега.',
	},
]

const WAVE_FACTS = [
	'Каждая волна прибавляет врагам 18% базового здоровья; скорость растёт медленнее и упирается в потолок.',
	'Каждую пятую волну замыкает босс: 460 HP в базе, дальше здоровье множится волной.',
	'За убийства дают золото и опыт, за удержанную волну — отдельную награду.',
	'Игра ставится на паузу в любой момент: камера, башни и волна ждут.',
	'Автосохранение раз в секунду: продолжение начинается с той же волны.',
]

const MAP_PANELS = [
	{
		title: 'Библиотека',
		tag: '3 таба',
		text: 'Рейтинговые, обычные и свои карты. Превью показывает всё поле целиком, поэтому дорогу видно до захода.',
		points: [
			'Размер поля и сложность на карточке',
			'Статусы: черновик, на проверке, опубликована, отклонена',
			'Личный топ каждой карты: волна, очки, попытки',
		],
	},
	{
		title: 'Свои карты',
		tag: 'сид',
		text: 'Карта создаётся одной кнопкой и сразу открывается в редакторе. Сид задаёт превью и цвет, а поле хранится черновиком и правится кистями.',
		points: [
			'Случайный сид при создании',
			'Превью и цвет выводятся из сида, сложность задаётся в редакторе',
			'Редактирование и удаление своих карт',
		],
	},
	{
		title: 'Модерация',
		tag: 'публикация',
		text: 'Своя карта живёт черновиком, пока автор не отправит её на проверку. Одобренные попадают в общую библиотеку.',
		points: [
			'Отправка на модерацию из библиотеки',
			'Админ-таб «На модерацию»',
			'Одобрение или отклонение карты',
		],
	},
]

const EDITOR_TOOLS = ['Замок', 'Казарма', 'Дорога', 'Река', 'Лес', 'Ластик']

const EDITOR_POINTS = [
	'Казармы задают состав волн: тип, количество, здоровье, скорость и рост.',
	'Волны можно описать общим расписанием или отдельно для каждой казармы.',
	'Проверка ловит карту без замка, без казармы и разорванные дороги.',
	'Пробный запуск прямо из редактора: сохранение открывает карту в бою.',
]

const RATING_FACTS = [
	{
		mark: '★',
		title: 'Звёзды сложности',
		text: 'От 1 до 10. Звёзды считаются по давлению атаки карты минус то, что она даёт обороне: длина дорог, размер поля, прочность замка.',
	},
	{
		mark: '≈',
		title: 'Глубина волн',
		text: 'Очки растут за каждую удержанную волну, но после 25-й прирост почти останавливается: забег считается практически полным.',
	},
	{
		mark: '⌂',
		title: 'Целость замка',
		text: 'Финальный множитель зависит от оставшихся жизней: целая крепость стоит заметно больше полумёртвой.',
	},
	{
		mark: 'Σ',
		title: 'Общий рейтинг',
		text: 'Сумма лучших результатов по разным картам: каждая следующая весит 0,95 от предыдущей, в зачёт идут топ-100 карт.',
	},
]

const PROFILE_POINTS = [
	'Аватар, рамка и титул с живым предпросмотром',
	'Статистика: игры, лучшая волна, рекорд, очки рейтинга',
	'История забегов по картам',
	'Общий топ игроков и топ каждой карты',
]
