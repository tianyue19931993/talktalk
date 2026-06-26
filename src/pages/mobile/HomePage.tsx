import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen, Play, Clock, Send, Loader2, CheckCircle } from 'lucide-react'
import { useAuth, refreshUserData } from '../../stores/authStore'
import { getRemainingGenerations } from '../../lib/supabase-auth'
import { generateQuestionDemo, getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
import { submitQuestionForAnalysis } from '../../lib/question-submit'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, subscription, generation } = useAuth()
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusKind, setStatusKind] = useState<'idle' | 'success' | 'error' | 'info'>('idle')
  const [latestQuestion, setLatestQuestion] = useState<UserQuestion | null>(null)
  const [latestDemos, setLatestDemos] = useState<QuestionDemo[]>([])
  const [latestActionMessage, setLatestActionMessage] = useState('')
  const [latestActionBusy, setLatestActionBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remainingGenerations = getRemainingGenerations(subscription, generation)

  function formatDateTime(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  useEffect(() => {
    const run = async () => {
      if (!isLoggedIn) {
        setLatestQuestion(null)
        setLatestDemos([])
        return
      }

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

    void run()
  }, [isLoggedIn])

  const loadLatest = async () => {
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

  const handleGenerateInteraction = async () => {
    if (!latestQuestion || latestActionBusy) return

    setLatestActionBusy(true)
    setLatestActionMessage('请耐心等待 1～3 分钟')
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      const result = await generateQuestionDemo(latestQuestion.id)
      if (result.success) {
        setLatestActionMessage(`观看 ${result.demo?.title || '演示'}`)
        await loadLatest()
        window.setTimeout(() => {
          setLatestActionMessage('')
          setLatestActionBusy(false)
        }, 2200)
        return
      }

      setLatestActionMessage(result.error || '生成失败，请重试')
    } finally {
      window.setTimeout(() => {
        setLatestActionBusy(false)
      }, 2200)
    }
  }

  const handleSubmit = async () => {
    const text = questionText.trim()
    if (!text || submitting) return

    if (!isLoggedIn) {
      navigate('/my')
      return
    }

    if (!subscription || remainingGenerations <= 0) {
      alert('当前套餐已没有可用的生成次数，请升级会员或联系管理员')
      navigate('/subscribe')
      return
    }

    setSubmitting(true)
    setStatusKind('info')
    setStatusMessage('请耐心等待 1～3 分钟')

    try {
      const result = await submitQuestionForAnalysis(text)

      if (result.notMath) {
        setStatusKind('error')
        setStatusMessage('请上传正确的内容')
        window.setTimeout(() => {
          setStatusMessage('')
          setStatusKind('idle')
        }, 4000)
        return
      }

      if (result.quotaError) {
        alert('当前套餐没有可用的生成次数，请升级会员或联系管理员')
        navigate('/subscribe')
        return
      }

      if (result.success) {
        setQuestionText('')
        setStatusKind('success')
        setStatusMessage('基础分析已完成')
        await refreshUserData()
        await loadLatest()
        window.setTimeout(() => {
          setStatusMessage('')
          setStatusKind('idle')
        }, 4500)
        return
      }

      setStatusKind('error')
      setStatusMessage(result.error || '生成失败，请重试')
      window.setTimeout(() => {
        setStatusMessage('')
        setStatusKind('idle')
      }, 5000)
    } catch {
      setStatusKind('error')
      setStatusMessage('操作失败，请重试')
      window.setTimeout(() => {
        setStatusMessage('')
        setStatusKind('idle')
      }, 4000)
    } finally {
      setSubmitting(false)
    }
  }

  const latestStatus = latestQuestion?.status || 'pending'
  const latestIsCompleted = latestQuestion?.status === 'completed'
  const latestHasDemo = latestDemos.length > 0 || latestQuestion?.status === 'uploaded'
  const latestStatusMeta = latestHasDemo
    ? { label: '已生成互动', color: 'text-blue-700 bg-blue-50', icon: Sparkles }
    : latestIsCompleted
      ? { label: '基础分析已完成', color: 'text-green-700 bg-green-50', icon: CheckCircle }
      : { label: '请耐心等待 1～3 分钟', color: 'text-yellow-600 bg-yellow-50', icon: Clock }
  const LatestStatusIcon = latestStatusMeta.icon

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-5 pt-6">
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] shadow-[0_2px_8px_rgba(121,40,202,0.2)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
            成长表达实验室 M
          </h2>
        </div>

        {isLoggedIn && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
            <Sparkles className="w-3.5 h-3.5" />
            当前可生成 {remainingGenerations} 次
          </div>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            placeholder="在此输入内容..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
              text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
              focus:outline-none focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]
              transition-all resize-y"
          />

          <div className="flex flex-col items-end gap-1">
            {statusMessage && (
              <div
                className={`w-full rounded-[var(--radius-md)] border px-3 py-2 ${
                  statusKind === 'error'
                    ? 'border-red-100 bg-red-50'
                    : statusKind === 'success'
                      ? 'border-green-100 bg-green-50'
                      : 'border-blue-100 bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  {statusKind === 'error' ? (
                    <span className="text-red-700">⚠</span>
                  ) : statusKind === 'success' ? (
                    <span className="text-green-700">✓</span>
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                  )}
                  <span
                    className={
                      statusKind === 'error'
                        ? 'text-red-700'
                        : statusKind === 'success'
                          ? 'text-green-700'
                          : 'text-blue-700'
                    }
                  >
                    {statusMessage}
                  </span>
                </div>
              </div>
            )}

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
              {submitting ? '分析中...' : '立即生成'}
            </button>
          </div>
        </div>
      </div>

      {isLoggedIn && latestQuestion && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5 border border-[var(--color-hairline)]">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[var(--color-link)]" />
            <span className="text-xs font-medium text-[var(--color-body)]">最近处理的题目</span>
          </div>

          <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-2 whitespace-pre-wrap mb-3">
            {latestQuestion.questionText}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${latestStatusMeta.color}`}>
              <LatestStatusIcon className="w-3 h-3" />
              {latestStatusMeta.label}
            </span>
            <span className="text-[10px] text-[var(--color-mute)]">
              {latestStatus === 'completed' && latestDemos.length > 0 && latestDemos[0]
                ? `生成于 ${formatDateTime(latestDemos[0].createdAt)}`
                : `提交于 ${formatDateTime(latestQuestion.createdAt)}`
              }
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--color-hairline)]">
            <div className="flex flex-wrap items-center gap-2">
              {latestIsCompleted && !latestHasDemo && (
                <button
                  onClick={(e) => { e.stopPropagation(); void handleGenerateInteraction() }}
                  disabled={latestActionBusy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-full
                    bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                    hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200 cursor-pointer"
                >
                  <Loader2 className={`w-3 h-3 ${latestActionBusy ? 'animate-spin' : ''}`} />
                  {latestActionBusy ? '生成中...' : '生成互动'}
                </button>
              )}

              {latestDemos.length > 0 ? (
                latestDemos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/my/demo/${demo.id}`) }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                      text-[var(--color-link)] bg-[var(--color-link-bg-soft)]
                      rounded-full hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-200 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    观看 {demo.title || '演示'}
                  </button>
                ))
              ) : !latestIsCompleted ? (
                <span className="text-[10px] text-[var(--color-mute)]">暂无演示动画</span>
              ) : null}
            </div>

            {latestActionMessage && (
              <p className="mt-2 text-[10px] text-[var(--color-mute)]">{latestActionMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
