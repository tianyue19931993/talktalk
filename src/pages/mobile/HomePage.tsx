import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getQuestions, getTypes } from '../../stores/appStore'
import { QuestionType, Question } from '../../types'

function TypeCard({ type, count }: { type: QuestionType; count: number }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px] p-4 bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)]">
      <span className="text-3xl">{type.icon || '📝'}</span>
      <span className="text-sm font-medium text-[var(--color-body)] text-center leading-tight">{type.name}</span>
      <span className="text-xs text-[var(--color-mute)]">{count}题</span>
    </div>
  )
}

function QuestionCard({ question }: { question: Question }) {
  const navigate = useNavigate()
  return (
    <div
      className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => navigate(`/lesson/${question.id}`)}
    >
      <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-2 line-clamp-2">{question.title}</h3>
      <div className="flex items-center gap-2 text-xs text-[var(--color-mute)] mb-2">
        <span>{question.grade}</span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-hairline)]" />
        <span>{question.typeName}</span>
      </div>
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {question.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-[var(--color-canvas-soft)] text-[var(--color-body)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const questions = getQuestions().filter((q) => q.status === 'published')
  const types = getTypes()

  const latestQuestions = questions.slice(0, 10)

  const typeQuestionCount = (typeId: string) =>
    questions.filter((q) => q.typeId === typeId).length

  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      {/* Header: Logo + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-[var(--color-ink)]">TalkTalk</span>
        </div>
        <div
          className="flex-1 flex items-center gap-2 h-10 px-3 bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] cursor-pointer"
          onClick={() => navigate('/lessons')}
        >
          <Search className="w-4 h-4 text-[var(--color-mute)] shrink-0" />
          <span className="text-sm text-[var(--color-mute)]">搜索题目…</span>
        </div>
      </div>

      {/* Hot Topics */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-3">热门题型</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {types.map((type) => (
            <TypeCard key={type.id} type={type} count={typeQuestionCount(type.id)} />
          ))}
        </div>
      </section>

      {/* Latest Questions */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-3">最新题目</h2>
        <div className="flex flex-col gap-3">
          {latestQuestions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
          {latestQuestions.length === 0 && (
            <p className="text-sm text-[var(--color-mute)] text-center py-8">暂无题目</p>
          )}
        </div>
      </section>
    </div>
  )
}
