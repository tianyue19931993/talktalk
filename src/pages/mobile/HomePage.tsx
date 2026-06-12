import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Send, BookOpen, Loader2, Check, Play, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { createUserQuestion, getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
import { generateDemo } from '../../lib/generate'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateStatus, setGenerateStatus] = useState('')
  const [latestQuestion, setLatestQuestion] = useState<UserQuestion | null>(null)
  const [latestDemos, setLatestDemos] = useState<QuestionDemo[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isLoggedIn) {
      getMyQuestions().then(async (list) => {
        if (list.length > 0) {
          setLatestQuestion(list[0])
          const demos = await getQuestionDemos(list[0].id)
          setLatestDemos(demos)
        }
      })
    }
  }, [isLoggedIn, submitted])

  const handleSubmit = async () => {
    if (!questionText.trim()) return

    if (!isLoggedIn) {
      navigate('/login?redirect=/')
      return
    }

    // 阶段：saving → analyzing → generating → done | error
    setSubmitting(true)
    setGenerateStatus('正在保存题目...')
    try {
      const saved = await createUserQuestion(questionText.trim())
      if (!saved) { alert('保存失败，请重试'); return }

      setSubmitted(true)
      setQuestionText('')

      // 调用 AI 生成
      setGenerating(true)
      setGenerateStatus('正在分析题型...')
      const result = await generateDemo(saved.id)

      if (result.success) {
        // 生成中...
        setGenerateStatus('正在生成互动演示...')
        // 刷新最新题目和 demos
        const list = await getMyQuestions()
        if (list.length > 0) {
          setLatestQuestion(list[0])
          const demos = await getQuestionDemos(list[0].id)
          setLatestDemos(demos)
        }
        setGenerateStatus('生成完成！')
      } else if (result.timedOut) {
        // 超时 — 题目已保存，提示用户去互动列表重试
        setGenerateStatus('⏱ 生成超时，可到「我的互动列表」重新生成')
      } else if (result.error?.includes('没有匹配到合适的题型')) {
        setGenerateStatus('❌ 没有匹配到合适的题型，请联系客服')
      } else {
        // 一般错误
        setGenerateStatus(result.error || '生成失败')
      }
    } catch {
      alert('操作失败，请重试')
    } finally {
      setSubmitting(false)
      setGenerating(false)
      // 3.5 秒后自动关闭状态提示
      setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 3500)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-5 pt-6">
      {/* Logo */}
      <div className="mb-6">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
          TalkTalk
        </span>
      </div>

      {/* Search Bar — 进题库 */}
      <div
        className="flex items-center gap-2.5 h-12 px-5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-full shadow-[var(--shadow-l2)] cursor-pointer mb-7 hover:shadow-[var(--shadow-l3)] hover:border-[var(--color-mute)] transition-all duration-200"
        onClick={() => navigate('/lessons')}
      >
        <Search className="w-4 h-4 text-[var(--color-mute)] shrink-0" />
        <span className="text-sm text-[var(--color-mute)]">搜索题目、题型、知识点…</span>
      </div>

      {/* 生成题目演示动画板块 */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] shadow-[0_2px_8px_rgba(121,40,202,0.2)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">生成题目演示动画</h2>
        </div>

        <p className="text-xs text-[var(--color-mute)] mb-3">
          录入题目文字，TalkTalk 将为您生成互动演示动画
        </p>

        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            placeholder="在此输入题目文字…"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
              text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
              focus:outline-none focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]
              transition-all resize-y"
          />

          <div className="flex items-center justify-end">
            {submitted ? (
              <StatusBadge
                message={generateStatus || '已保存'}
                isError={generateStatus?.includes('❌') || generateStatus?.includes('超时') || generateStatus?.includes('失败')}
                isTimeout={generateStatus?.includes('超时') || false}
                onGoToList={() => navigate('/my/questions')}
              />
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!questionText.trim() || submitting || generating}
                className="inline-flex items-center gap-1.5 px-5 h-9 text-sm font-medium text-white rounded-full
                  bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                  shadow-[0_1px_8px_rgba(121,40,202,0.2)]
                  hover:shadow-[0_2px_16px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                {submitting || generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? '保存中...' : generating ? '生成中...' : '立即生成'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 最近生成的互动 — 未登录时不显示 */}
      {isLoggedIn && latestQuestion && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[var(--color-link)]" />
            <span className="text-xs font-medium text-[var(--color-body)]">最近生成的互动</span>
          </div>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-2 whitespace-pre-wrap mb-3">
            {latestQuestion.questionText}
          </p>
          {latestDemos.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-hairline)]">
              {latestDemos.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => navigate(`/my/demo/${demo.id}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                    text-[var(--color-link)] bg-[var(--color-link-bg-soft)]
                    rounded-full hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  查看 {demo.title || '演示'}
                </button>
              ))}
            </div>
          ) : (
            <div className="pt-2 border-t border-[var(--color-hairline)]">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-yellow-600 bg-yellow-50">暂未生成</span>
            </div>
          )}
        </div>
      )}

      {/* 我的互动演示入口 */}
      <button
        onClick={() => navigate('/my/questions')}
        className="inline-flex items-center justify-center gap-2 w-full h-12 text-sm font-medium text-white rounded-full
          bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
          shadow-[0_1px_8px_rgba(121,40,202,0.2)]
          hover:shadow-[0_2px_16px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-200 cursor-pointer"
      >
        <BookOpen className="w-4 h-4" />
        我的互动演示
      </button>
    </div>
  )
}

// ─── 生成状态徽章组件 ───────────────────────

function StatusBadge({
  message,
  isError,
  isTimeout,
  onGoToList,
}: {
  message: string
  isError?: boolean
  isTimeout?: boolean
  onGoToList?: () => void
}) {
  const isGenerating = message.includes('分析') || message.includes('生成')
  const isDone = message.includes('完成')

  // 完成状态
  if (isDone) {
    return (
      <span className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
        <Check className="w-3.5 h-3.5" />
        {message}
      </span>
    )
  }

  // 生成中状态
  if (isGenerating) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {message}
      </span>
    )
  }

  // 超时/错误状态
  if (isTimeout) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">
          <Clock className="w-3.5 h-3.5" />
          {message}
        </span>
        {onGoToList && (
          <button
            onClick={onGoToList}
            className="text-xs text-[var(--color-link)] underline hover:no-underline cursor-pointer"
          >
            去我的互动列表重新生成 →
          </button>
        )}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-full bg-red-50 text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {message}
        </span>
        {onGoToList && (
          <button
            onClick={onGoToList}
            className="text-xs text-[var(--color-link)] underline hover:no-underline cursor-pointer"
          >
            去我的互动列表重新生成 →
          </button>
        )}
      </div>
    )
  }

  // 默认（已保存等）
  return (
    <span className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
      <Check className="w-3.5 h-3.5" />
      {message}
    </span>
  )
}
