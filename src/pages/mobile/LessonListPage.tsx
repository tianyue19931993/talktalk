import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { getQuestions, getTypes } from '../../stores/appStore'
import { GRADES, Question } from '../../types'

// Brand tag color palette — deterministic by tag name hash
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '重量问题': { bg: '#e8faf0', text: '#0d7c3f' },
  '应用题': { bg: '#f0edff', text: '#5a3ec8' },
  '两端都种': { bg: '#e6f7ff', text: '#0077b6' },
  '易错题': { bg: '#fff0f0', text: '#c41e3a' },
  '期中考试': { bg: '#fff7e6', text: '#b8860b' },
  '行程问题': { bg: '#e6faf5', text: '#0d9488' },
  '环形植树': { bg: '#f3e8ff', text: '#7c3aed' },
  '差量问题': { bg: '#fce7f3', text: '#be185d' },
}

function tagStyle(tag: string) {
  const c = TAG_COLORS[tag]
  if (c) return { backgroundColor: c.bg, color: c.text }
  // Fallback: use brand blue style
  return {}
}

function QuestionCard({ question }: { question: Question }) {
  const navigate = useNavigate()
  const imageCount = question.images?.length || 0
  const demoCount = question.htmlDemos?.length || 0

  return (
    <div
      className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 cursor-pointer hover:shadow-[var(--shadow-l3)] hover:-translate-y-0.5 transition-all duration-200 border border-[var(--color-hairline)]"
      onClick={() => navigate(`/lesson/${question.id}`)}
    >
      <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-2.5 leading-relaxed line-clamp-2">{question.question}</h3>
      <div className="flex items-center gap-2 text-xs text-[var(--color-mute)] mb-2.5">
        <span>{question.grade}</span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-hairline)]" />
        <span>{question.typeName}</span>
      </div>
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {question.tags.map((tag) => (
            <Badge key={tag} className="!bg-[var(--color-link-bg-soft)] !text-[var(--color-link)]">{tag}</Badge>
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
      {/* Search bar — pill style matching homepage */}
      <div className="flex items-center gap-2.5 h-12 px-5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-full shadow-[var(--shadow-l2)] hover:shadow-[var(--shadow-l3)] hover:border-[var(--color-mute)] transition-all duration-200">
        <Search className="w-4 h-4 text-[var(--color-mute)] shrink-0" />
        <input
          placeholder="搜索题目、内容、题型、标签…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-mute)] focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[var(--color-mute)] hover:text-[var(--color-ink)] transition-colors cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
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
