import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchInput } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { getQuestions, getTypes } from '../../stores/appStore'
import { GRADES, Question } from '../../types'

function QuestionCard({ question }: { question: Question }) {
  const navigate = useNavigate()
  const imageCount = question.images?.length || 0
  const demoCount = question.htmlDemos?.length || 0

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
        <div className="flex flex-wrap gap-1 mb-2">
          {question.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
      {(imageCount > 0 || demoCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-[var(--color-mute)]">
          {imageCount > 0 && <span>{imageCount}张图片</span>}
          {demoCount > 0 && <span>{demoCount}个演示</span>}
        </div>
      )}
    </div>
  )
}

export default function LessonListPage() {
  const navigate = useNavigate()
  const allQuestions = getQuestions().filter((q) => q.status === 'published')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')

  const filtered = useMemo(() => {
    let result = allQuestions

    // Keyword search (title, question content, type name, tags)
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      result = result.filter(
        (q) =>
          q.title.toLowerCase().includes(kw) ||
          q.question.toLowerCase().includes(kw) ||
          q.typeName.toLowerCase().includes(kw) ||
          q.tags.some((t) => t.toLowerCase().includes(kw))
      )
    }

    // Grade filter
    if (gradeFilter) {
      result = result.filter((q) => q.grade === gradeFilter)
    }

    return result
  }, [allQuestions, search, gradeFilter])

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            placeholder="搜索标题、内容、题型、标签…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <button
          onClick={() => navigate('/')}
          className="shrink-0 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer"
        >
          取消
        </button>
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-mute)] shrink-0">年级</span>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="flex-1 h-9 px-3 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)]"
        >
          <option value="">全部</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Question list */}
      <div className="flex flex-col gap-3 pb-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-mute)] text-center py-12">没有找到匹配的题目</p>
        ) : (
          filtered.map((q) => <QuestionCard key={q.id} question={q} />)
        )}
      </div>
    </div>
  )
}
