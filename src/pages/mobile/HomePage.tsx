import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Send, BookOpen, Loader2, Check, Play, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { canCreateDemo, canViewDemo } from '../../lib/supabase-auth'
import { getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
import { generateDemo, pollQuestionDemos } from '../../lib/generate'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, subscription } = useAuth()
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [generateStatus, setGenerateStatus] = useState('')
  const [latestQuestion, setLatestQuestion] = useState<UserQuestion | null>(null)
  const [latestDemos, setLatestDemos] = useState<QuestionDemo[]>([])
  const [notMathError, setNotMathError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 加载最新题目
  const loadLatest = async (forceReload?: boolean) => {
    if (forceReload || isLoggedIn) {
      const list = await getMyQuestions()
      if (list.length > 0) {
        setLatestQuestion(list[0])
        const demos = await getQuestionDemos(list[0].id)
        setLatestDemos(demos)
      } else {
        setLatestQuestion(null)
        setLatestDemos([])
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!isLoggedIn && !submitted) {
        if (!cancelled) {
          setLatestQuestion(null)
          setLatestDemos([])
        }
        return
      }

      if (!isLoggedIn) return

      const list = await getMyQuestions()
      if (cancelled) return

      if (list.length > 0) {
        setLatestQuestion(list[0])
        const demos = await getQuestionDemos(list[0].id)
        if (!cancelled) setLatestDemos(demos)
      } else {
        setLatestQuestion(null)
        setLatestDemos([])
      }
    }

    void run()
    return () => { cancelled = true }
  }, [isLoggedIn, submitted])

  const handleSubmit = async () => {
    if (!questionText.trim()) return

    if (!isLoggedIn) {
      navigate('/login?redirect=/')
      return
    }

    // 权限检查：只有 AI 会员才能创建互动演示
    if (!subscription || !canCreateDemo(subscription)) {
      alert('当前套餐不支持创建互动演示，请升级会员')
      navigate('/subscribe')
      return
    }

    setSubmitting(true)
    setGenerateStatus('正在验证题目...')
    setSubmitted(true)

    try {
      const result = await generateDemo(questionText.trim(), { type: 'submit' })

      if (result.notMath) {
        // 不是数学题 → 不落库，不清空输入框，显示提示
        setGenerateStatus('❌ 请输入正确的数学题')
        setNotMathError(true)
        setTimeout(() => { setSubmitted(false); setGenerateStatus(''); setNotMathError(false) }, 4000)
        return
      }

      // 数学题：API 已落库，清空输入框、刷新列表
      setQuestionText('')
      await loadLatest()

      if (result.success) {
        setGenerateStatus('生成完成！')
        await loadLatest(true)
        setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 3500)
      } else if (result.timedOut) {
        // 超时 — 启动轮询检测是否实际已生成
        setGenerateStatus('⏱ 生成超时，正在确认结果...')
        if (result.questionId) {
          pollQuestionDemos(
            result.questionId,
            (demos) => {
              setLatestDemos(demos as QuestionDemo[])
              setGenerateStatus('生成完成！')
              setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 3500)
            },
            () => {
              loadLatest(true)
            },
            () => {
              setGenerateStatus('⏱ 生成超时，可到「我的互动列表」重新生成')
              setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 5000)
            }
          )
        } else {
          setGenerateStatus('⏱ 生成超时，可到「我的互动列表」重新生成')
          setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 5000)
        }
      } else {
        // 其他错误（API 已落库题目，只是生成失败了）
        setGenerateStatus(result.error || '生成失败，请重试')
        setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 5000)
      }
    } catch {
      setGenerateStatus('操作失败，请重试')
      setTimeout(() => { setSubmitted(false); setGenerateStatus('') }, 4000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-5 pt-6">
      {/* Logo */}
      <div className="mb-6">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
          成长表达实验室 M
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

      {/* 应用题可视化演示板块 */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] shadow-[0_2px_8px_rgba(121,40,202,0.2)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">应用题可视化演示</h2>
        </div>

        <p className="text-xs text-[var(--color-mute)] mb-3">
          录入题目文字，成长表达实验室 M 将为您可视化～
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

          <div className="flex flex-col items-end gap-1">
            {submitted ? (
              <>
              <StatusBadge
                message={generateStatus || '已保存'}
                isError={generateStatus?.includes('❌') || generateStatus?.includes('失败')}
                isTimeout={generateStatus?.includes('超时') || false}
                isPolling={generateStatus?.includes('确认结果') || false}
                onGoToList={notMathError ? undefined : () => navigate('/my/questions')}
              />
              {generateStatus === '正在验证题目...' && (
                <span className="text-[10px] text-[var(--color-mute)] text-right">请耐心等待 1～3 分钟</span>
              )}
              </>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!questionText.trim() || submitting}
                className="inline-flex items-center gap-1.5 px-5 h-9 text-sm font-medium text-white rounded-full
                  bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                  shadow-[0_1px_8px_rgba(121,40,202,0.2)]
                  hover:shadow-[0_2px_16px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? '验证中...' : '立即生成'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 最近生成的互动 — 需要有效订阅才能查看 */}
      {isLoggedIn && latestQuestion && canViewDemo(subscription) && (
        <div
          className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5 cursor-pointer hover:shadow-[var(--shadow-l3)] transition-all duration-200"
          onClick={() => navigate('/my/questions')}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[var(--color-link)]" />
            <span className="text-xs font-medium text-[var(--color-body)]">最近生成的互动</span>
          </div>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-2 whitespace-pre-wrap mb-3">
            {latestQuestion.questionText}
          </p>

          {/* 已生成（有演示） */}
          {latestDemos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-hairline)]">
              {latestDemos.map((demo) => (
                <button
                  key={demo.id}
                  onClick={(e) => { e.stopPropagation(); navigate(`/my/demo/${demo.id}`) }}
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
          )}

          {/* 无演示 */}
          {latestDemos.length === 0 && (
            <div className="pt-2 border-t border-[var(--color-hairline)]">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-yellow-600 bg-yellow-50">
                待生成
              </span>
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
  isPolling,
  onGoToList,
}: {
  message: string
  isError?: boolean
  isTimeout?: boolean
  isPolling?: boolean
  onGoToList?: () => void
}) {
  const isGenerating = message.includes('分析') || message.includes('生成')

  // 完成状态
  if (message.includes('完成')) {
    return (
      <span className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
        <Check className="w-3.5 h-3.5" />
        {message}
      </span>
    )
  }

  // 轮询中状态
  if (isPolling) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {message}
        </span>
      </div>
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

  // 超时状态
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
