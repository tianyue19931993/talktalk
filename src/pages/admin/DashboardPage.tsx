import { useMemo } from 'react'
import { getQuestions, getTypes, getTags, subscribe } from '../../stores/appStore'
import { LayoutDashboard, FileText, BookType, Tags, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  const questions = getQuestions()
  const types = getTypes()
  const tags = getTags()

  const totalQuestions = questions.length
  const totalTypes = types.length
  const totalTags = tags.length
  const publishedQuestions = questions.filter((q) => q.status === 'published')

  const cards = [
    { label: '总题目数', value: totalQuestions, icon: FileText, color: 'text-blue-600' },
    { label: '总题型数', value: totalTypes, icon: BookType, color: 'text-purple-600' },
    { label: '总标签数', value: totalTags, icon: Tags, color: 'text-green-600' },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <LayoutDashboard className="w-5 h-5 text-[var(--color-ink)]" />
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">概览</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-body)] mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-[var(--color-ink)]">{card.value}</p>
              </div>
              <card.icon className={`w-8 h-8 ${card.color} opacity-80`} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent published questions */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-4">最近发布</h2>
        {publishedQuestions.length === 0 ? (
          <p className="text-sm text-[var(--color-mute)] py-8 text-center">暂无已发布的题目</p>
        ) : (
          <div className="grid gap-3">
            {publishedQuestions.slice(0, 10).map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-sm)] bg-[var(--color-canvas-soft)] hover:bg-[var(--color-canvas-soft-2)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-[var(--color-mute)] shrink-0" />
                  <span className="text-sm text-[var(--color-ink)] truncate">{q.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0">{q.grade}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-mute)] shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {q.createdAt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
