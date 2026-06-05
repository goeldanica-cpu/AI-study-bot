import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const masteryScore: Record<string, number> = {
  Strong: 4,
  Proficient: 3,
  Developing: 2,
  Introduced: 1,
  'In Progress': 0,
}

const subjectStyles: Record<string, string> = {
  Physics: 'bg-blue-500/10 text-blue-200 ring-blue-500/30',
  Biology: 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30',
  Mathematics: 'bg-violet-500/10 text-violet-200 ring-violet-500/30',
  'Computer Science': 'bg-orange-500/10 text-orange-200 ring-orange-500/30',
  Chemistry: 'bg-red-500/10 text-red-200 ring-red-500/30',
}

const masteryPillStyles: Record<string, string> = {
  Strong: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
  Proficient: 'bg-sky-500/15 text-sky-200 ring-sky-500/30',
  Developing: 'bg-yellow-500/15 text-amber-200 ring-amber-500/30',
  Introduced: 'bg-violet-500/15 text-violet-200 ring-violet-500/30',
  'In Progress': 'bg-slate-500/15 text-slate-200 ring-slate-500/30',
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Unknown'
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .order('last_updated', { ascending: false })

  const concepts = data ?? []
  const totalConcepts = concepts.length
  const uniqueSubjects = new Set(concepts.map((concept) => concept.subject)).size
  const averageMastery =
    totalConcepts > 0
      ?
          Math.round(
            (concepts.reduce(
              (sum, concept) => sum + (masteryScore[concept.mastery_level] ?? 0),
              0
            ) /
              (totalConcepts * 4)) *
              100
          )
      : 0

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 py-8 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-white">Study Agent</div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="rounded-full px-3 py-2 text-slate-200 transition hover:bg-slate-800">
              Chat
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-700 px-3 py-2 text-white transition hover:bg-slate-600"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Concept Study Overview</h1>
              <p className="mt-2 max-w-xl text-slate-400">
                Review your learning progress, subject coverage, and mastery levels all in one place.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total Concepts</p>
              <p className="mt-3 text-3xl font-semibold text-white">{totalConcepts}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Unique Subjects</p>
              <p className="mt-3 text-3xl font-semibold text-white">{uniqueSubjects}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Average Mastery</p>
              <p className="mt-3 text-3xl font-semibold text-white">{averageMastery}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {concepts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-10 text-center text-slate-400">
              No concepts found yet. Start a chat and save a concept to populate your dashboard.
            </div>
          ) : (
            concepts.map((concept) => {
              const subjectClass = subjectStyles[concept.subject] ?? 'bg-slate-700/10 text-slate-200 ring-slate-600/30'
              const masteryClass = masteryPillStyles[concept.mastery_level] ?? masteryPillStyles['In Progress']
              const progress = Math.round(((masteryScore[concept.mastery_level] ?? 0) / 4) * 100)

              return (
                <details
                  key={`${concept.subject}-${concept.concept}`}
                  className="group overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/80 transition hover:border-slate-500"
                >
                  <summary className="flex cursor-pointer flex-col gap-5 px-6 py-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${subjectClass}`}>
                          {concept.subject}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${masteryClass}`}>
                          {concept.mastery_level}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">{concept.concept}</h2>
                        <p className="mt-1 text-sm text-slate-400">Last updated {formatDate(concept.last_updated)}</p>
                      </div>
                    </div>
                    <div className="w-full max-w-md space-y-3 sm:w-auto">
                      <div className="rounded-full bg-slate-800/80 p-3">
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <span>Progress</span>
                          <span className="font-semibold text-white">{progress}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-800 bg-slate-950/80 px-6 py-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-slate-500">Strong Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {(concept.strong_areas || []).length > 0 ? (
                            concept.strong_areas.map((item: string, index: number) => (
                              <span
                                key={`strong-${index}`}
                                className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">No strong areas recorded</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-slate-500">Weak Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {(concept.weak_areas || []).length > 0 ? (
                            concept.weak_areas.map((item: string, index: number) => (
                              <span
                                key={`weak-${index}`}
                                className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-200"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">No weak areas recorded</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-slate-500">Next Steps</p>
                        <div className="flex flex-wrap gap-2">
                          {(concept.next_steps || []).length > 0 ? (
                            concept.next_steps.map((item: string, index: number) => (
                              <span
                                key={`next-${index}`}
                                className="rounded-full bg-sky-500/10 px-3 py-1 text-sm text-sky-200"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">No next steps recorded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
