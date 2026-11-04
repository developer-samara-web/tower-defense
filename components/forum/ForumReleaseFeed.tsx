import Link from 'next/link'

import {
	UPDATES,
	UPDATE_KIND_LABEL,
	formatUpdateDate,
	type UpdateKind,
} from '@/lib/updates'

const KIND_STYLE: Record<UpdateKind, string> = {
	new: 'border-lime-500/60 bg-lime-500/10 text-lime-300',
	fix: 'border-sky-500/60 bg-sky-500/10 text-sky-300',
	balance: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
	ui: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-200',
}

// Короткая лента релизов во вкладке «Обновления»: полная история
// остаётся на /updates, а здесь видно, что обсуждать прямо сейчас.
export default function ForumReleaseFeed() {
	return (
		<section className="mt-5 border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(74,55,35,0.18)]">
			<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a2a1a] px-3 py-2.5">
				<div>
					<h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
						Последние версии
					</h2>
					<p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
						Что изменилось в игре
					</p>
				</div>
				<Link
					href="/updates"
					className="border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					Вся история
				</Link>
			</header>

			<ol className="divide-y divide-[#2a1d0a]">
				{UPDATES.slice(0, 3).map((release) => (
					<li key={release.version} className="px-3 py-2.5">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
							<span className="border border-[#6b4c1f] bg-[#2a1d0a] px-1.5 py-0.5 text-[9px] font-black tracking-[0.06em] text-amber-300">
								v{release.version}
							</span>
							<span className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-200">
								{release.title}
							</span>
							<time
								dateTime={release.date}
								className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]"
							>
								{formatUpdateDate(release.date)}
							</time>
						</div>
						<p className="mt-1 text-[10px] font-bold leading-snug text-[#b5a17b]">
							{release.summary}
						</p>
						<div className="mt-1.5 flex flex-wrap gap-1">
							{release.changes.slice(0, 3).map((change) => (
								<span
									key={change.text}
									className={`border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${KIND_STYLE[change.kind]}`}
								>
									{UPDATE_KIND_LABEL[change.kind]}
								</span>
							))}
						</div>
					</li>
				))}
			</ol>
		</section>
	)
}
