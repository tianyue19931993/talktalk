import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen, Play, Clock, Send, Loader2 } from 'lucide-react'
import { useAuth, refreshUserData } from '../../stores/authStore'
import { getRemainingGenerations } from '../../lib/supabase-auth'
import { getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remainingGenerations = getRemainingGenerations(subscription, generation)

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
        <div
          className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5 cursor-pointer hover:shadow-[var(--shadow-l3)] transition-all duration-200"
          onClick={() => navigate('/my/questions')}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[var(--color-link)]" />
            <span className="text-xs font-medium text-[var(--color-body)]">最近处理的题目</span>
          </div>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-2 whitespace-pre-wrap mb-3">
            {latestQuestion.questionText}
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-hairline)]">
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                latestStatus === 'completed'
                  ? 'text-green-700 bg-green-50'
                  : latestStatus === 'pending'
                    ? 'text-yellow-600 bg-yellow-50'
                    : 'text-blue-700 bg-blue-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              {latestStatus === 'completed'
                ? '基础分析已完成'
                : latestStatus === 'pending'
                  ? '请耐心等待 1～3 分钟'
                  : '已上传'}
            </span>
            <span className="text-[10px] text-[var(--color-mute)]">
              {latestDemos.length > 0 ? `已有 ${latestDemos.length} 个演示` : '暂未接入演示生成'}
            </span>
          </div>

          {latestDemos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3">
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
        </div>
      )}
    </div>
  )
}
