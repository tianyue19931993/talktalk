import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Play, Sparkles, CheckCircle, Download, RefreshCw } from 'lucide-react'
import { clearVividDemoPending, downloadQuestionDemo, generateQuestionDemo, getDemoDisplayTitle, getUserQuestion, getQuestionDemos, isBasicInteractionDemo, isVividDemo, isVividDemoPending, markVividDemoPending } from '../../lib/user-questions'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '请耐心等待 1～3 分钟', color: 'text-yellow-700 bg-yellow-50' },
  completed: { label: '基础分析已完成', color: 'text-green-700 bg-green-50' },
  uploaded: { label: '已生成互动', color: 'text-blue-700 bg-blue-50' },
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default function MyQuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [question, setQuestion] = useState<UserQuestion | null>(null)
  const [demos, setDemos] = useState<QuestionDemo[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [vividGenerating, setVividGenerating] = useState(false)
  const [, forceVividPendingRefresh] = useState(0)
  const [actionMessage, setActionMessage] = useState('')

  const refreshData = async () => {
    if (!id) return
    const q = await getUserQuestion(id)
    setQuestion(q)
    if (q) {
      const d = await getQuestionDemos(q.id)
      setDemos(d)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadAll = async () => {
      if (!id) return
      setLoading(true)
      await refreshData()
      if (!cancelled) setLoading(false)
    }

    void loadAll()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    const handlePendingChange = () => {
      forceVividPendingRefresh((value) => value + 1)
    }

    window.addEventListener('vivid-demo-pending-changed', handlePendingChange)
    return () => {
      window.removeEventListener('vivid-demo-pending-changed', handlePendingChange)
    }
  }, [])

  const hasVividDemo = demos.some(isVividDemo)
  const vividPending = Boolean(question && !hasVividDemo && (vividGenerating || isVividDemoPending(question.id)))

  useEffect(() => {
    if (!question) return
    if (hasVividDemo) {
      clearVividDemoPending(question.id)
    }
  }, [question?.id, hasVividDemo])

  useEffect(() => {
    if (!question?.id || !vividPending) return

    let cancelled = false

    const refresh = async () => {
      if (cancelled) return
      await refreshData()
    }

    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, 5000)
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      clearVividDemoPending(question.id)
      setVividGenerating(false)
      setActionMessage('生成失败，请重试')
    }, 240000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [question?.id, vividPending])

  const handleGenerateInteraction = async () => {
    if (!question || generating) return

    setGenerating(true)
    setActionMessage('请耐心等待 1～3 分钟')
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      const result = await generateQuestionDemo(question.id)
      if (result.success) {
        setActionMessage(`观看 ${result.demo?.title || '演示'}`)
        const next = await getQuestionDemos(question.id)
        setDemos(next)
        const nextQuestion = await getUserQuestion(question.id)
        if (nextQuestion) setQuestion(nextQuestion)
      } else {
        setActionMessage(result.error || '生成失败，请重试')
      }
    } finally {
      window.setTimeout(() => {
        setGenerating(false)
        setActionMessage('')
      }, 2200)
    }
  }

  const handleGenerateVividDemo = async () => {
    if (!question || vividPending) return

    markVividDemoPending(question.id)
    setVividGenerating(true)
    setActionMessage('正在生成生动演示...')
    try {
      const result = await generateQuestionDemo(question.id, 'vivid')
      if (result.pending) {
        setActionMessage('请耐心等待 1～3 分钟')
        await refreshData()
      } else if (result.success) {
        setActionMessage(`观看 ${result.demo?.title || '演示1'}`)
        await refreshData()
      } else {
        setActionMessage(result.error || '生成失败，请重试')
        clearVividDemoPending(question.id)
      }
    } finally {
      setVividGenerating(false)
    }
  }

  const handleDownloadDemo = async (demo: QuestionDemo) => {
    try {
      await downloadQuestionDemo(demo.id, getDemoDisplayTitle(demo))
    } catch (error) {
      alert(error instanceof Error ? error.message : '下载失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-canvas-soft)]">
        <p className="text-sm text-[var(--color-mute)]">加载中...</p>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4 bg-[var(--color-canvas-soft)] min-h-screen">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-mute)]">
          <p className="text-base font-medium">题目未找到</p>
        </div>
      </div>
    )
  }

  const st = STATUS_MAP[question.status] || STATUS_MAP.pending
  const hasDemo = demos.length > 0
  const hasBasicInteraction = demos.some(isBasicInteractionDemo)
  const isCompleted = question.status === 'completed'
  const StatusIcon = question.status === 'uploaded'
    ? Sparkles
    : question.status === 'completed'
      ? CheckCircle
      : Clock

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-4 pt-4 pb-8 max-w-lg mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="sticky top-0 z-10 inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer bg-[var(--color-canvas-soft)] py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <section className="mt-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">题目原文</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]">
          <p className="text-sm text-[var(--color-body)] leading-relaxed whitespace-pre-wrap">{question.questionText}</p>
        </div>
      </section>

      <section className="mt-4">
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${st.color}`}>
              <StatusIcon className="w-3 h-3" />
              {st.label}
            </span>
            <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
              <span className="shrink-0 text-xs text-[var(--color-mute)]">{formatDateTime(question.createdAt)}</span>
              {question.status !== 'pending' && (
                <div className="flex shrink-0 items-center gap-2">
                  {!hasBasicInteraction && (
                    <button
                      onClick={handleGenerateInteraction}
                      disabled={generating}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-full
                        bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                        hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? '生成中...' : '生成基础互动'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateVividDemo}
                    disabled={vividPending}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className={`h-3 w-3 ${vividPending ? 'animate-pulse' : ''}`} />
                    {vividPending ? '生成中...' : hasVividDemo ? '再次演示' : '演示'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--color-hairline)]">
            <div className="flex flex-wrap items-center gap-2">
              {hasDemo ? demos.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => navigate(`/my/demo/${demo.id}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                    text-[var(--color-link)] bg-[var(--color-link-bg-soft)]
                    rounded-full hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 cursor-pointer"
                >
                  <Play className="w-3 h-3" />观看 {getDemoDisplayTitle(demo)}
                </button>
              )) : !isCompleted ? (
                <span className="text-[10px] text-[var(--color-mute)]">暂无演示动画</span>
              ) : null}
            </div>
            {actionMessage && (
              <p className="mt-2 text-[10px] text-[var(--color-mute)]">{actionMessage}</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">互动演示</h2>
        {demos.length > 0 ? (
          <div className="space-y-3">
            {demos.map((demo) => (
              <div key={demo.id} className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]">
                <p className="text-sm font-medium text-[var(--color-ink)] mb-3">{getDemoDisplayTitle(demo)}</p>
                <p className="text-[10px] text-[var(--color-mute)] mb-3">生成于 {formatDateTime(demo.createdAt)}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate(`/my/demo/${demo.id}`)}
                    className="inline-flex items-center gap-1.5 px-4 h-8 text-sm font-medium text-white rounded-full
                      bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                      shadow-[0_1px_4px_rgba(121,40,202,0.15)] hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-200 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />观看
                  </button>
                  <button
                    onClick={() => void handleDownloadDemo(demo)}
                    className="inline-flex items-center gap-1.5 px-4 h-8 text-sm font-medium text-[var(--color-body)] rounded-full
                      bg-[var(--color-canvas)] border border-[var(--color-hairline)] hover:border-[var(--color-mute)] hover:text-[var(--color-ink)]
                      transition-all duration-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-6 border border-dashed border-[var(--color-hairline)] text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-canvas-soft-2)] flex items-center justify-center">
              <Clock className="w-6 h-6 text-[var(--color-mute)]" />
            </div>
            <p className="text-sm text-[var(--color-mute)]">暂无演示动画</p>
            <p className="text-xs text-[var(--color-mute)] mt-1">管理员上传后即可查看</p>
          </div>
        )}
      </section>
    </div>
  )
}
