import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, CheckCircle, Play, Search, RefreshCw, Sparkles, Download } from 'lucide-react'
import { clearVividDemoPending, downloadQuestionDemo, generateQuestionDemo, getDemoDisplayTitle, getMyQuestions, getQuestionDemosBatch, isBasicInteractionDemo, isVividDemo, isVividDemoPending, markVividDemoPending } from '../../lib/user-questions'
import { useAuth } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default function MyQuestionsPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [questions, setQuestions] = useState<UserQuestion[]>([])
  const [demosMap, setDemosMap] = useState<Record<string, QuestionDemo[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [vividGeneratingId, setVividGeneratingId] = useState<string | null>(null)
  const [, forceVividPendingRefresh] = useState(0)
  const [generateHint, setGenerateHint] = useState<{ id: string; text: string } | null>(null)

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return questions
    const q = search.toLowerCase()
    return questions.filter(
      (item) =>
        item.questionText.toLowerCase().includes(q) ||
        (item.questionType && item.questionType.toLowerCase().includes(q)) ||
        (item.coreDiscovery && item.coreDiscovery.toLowerCase().includes(q))
    )
  }, [questions, search])

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login?redirect=/my/questions')
      return
    }
    void loadAll({ showLoading: true })
  }, [isLoggedIn, navigate])

  useEffect(() => {
    const handlePendingChange = () => {
      forceVividPendingRefresh((value) => value + 1)
    }

    window.addEventListener('vivid-demo-pending-changed', handlePendingChange)
    return () => {
      window.removeEventListener('vivid-demo-pending-changed', handlePendingChange)
    }
  }, [])

  async function loadAll(options: { showLoading?: boolean } = {}) {
    const { showLoading = false } = options
    if (showLoading) setLoading(true)
    const list = await getMyQuestions()
    setQuestions(list)

    const map = await getQuestionDemosBatch(list.map((q) => q.id))
    for (const [questionId, demos] of Object.entries(map)) {
      if (demos.some(isVividDemo)) {
        clearVividDemoPending(questionId)
      }
    }
    setDemosMap(map)
    if (showLoading) setLoading(false)
  }

  const hasAnyVividPending = questions.some((question) => {
    const demos = demosMap[question.id] || []
    return !demos.some(isVividDemo) && isVividDemoPending(question.id)
  })

  useEffect(() => {
    if (!hasAnyVividPending) return

    let cancelled = false

    const refresh = async () => {
      if (cancelled) return
      await loadAll()
    }

    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, 5000)
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      for (const question of questions) {
        if (isVividDemoPending(question.id)) {
          clearVividDemoPending(question.id)
        }
      }
      setVividGeneratingId(null)
      setGenerateHint(null)
    }, 240000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [hasAnyVividPending, questions])

  const handleGenerateInteraction = async (question: UserQuestion) => {
    if (generatingId) return

    setGeneratingId(question.id)
    setGenerateHint({ id: question.id, text: '请耐心等待 1～3 分钟' })
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      const result = await generateQuestionDemo(question.id)
      if (result.success) {
        setGenerateHint({ id: question.id, text: `观看 ${result.demo?.title || '演示'}` })
        await loadAll()
        return
      }

      setGenerateHint({ id: question.id, text: result.error || '生成失败，请重试' })
    } finally {
      window.setTimeout(() => {
        setGeneratingId(null)
        setGenerateHint(null)
      }, 2200)
    }
  }

  const handleGenerateVividDemo = async (question: UserQuestion) => {
    if (vividGeneratingId === question.id || isVividDemoPending(question.id)) return

    markVividDemoPending(question.id)
    setVividGeneratingId(question.id)
    setGenerateHint({ id: question.id, text: '正在生成生动演示...' })
    try {
      const result = await generateQuestionDemo(question.id, 'vivid')
      if (result.pending) {
        setGenerateHint({ id: question.id, text: '请耐心等待 1～3 分钟' })
        await loadAll()
      } else if (result.success) {
        setGenerateHint({ id: question.id, text: `观看 ${result.demo?.title || '演示1'}` })
        await loadAll()
      } else {
        setGenerateHint({ id: question.id, text: result.error || '生成失败，请重试' })
        clearVividDemoPending(question.id)
      }
    } finally {
      setVividGeneratingId(null)
    }
  }

  const handleDownloadDemo = async (demo: QuestionDemo) => {
    try {
      await downloadQuestionDemo(demo.id, getDemoDisplayTitle(demo))
    } catch (error) {
      alert(error instanceof Error ? error.message : '下载失败')
    }
  }

  const openDemo = (demoId: string) => {
    navigate(`/my/demo/${demoId}`)
  }

  const getStatusMeta = (q: UserQuestion, demos: QuestionDemo[]) => {
    if (q.status === 'uploaded' || demos.length > 0) {
      return { label: '已生成互动', color: 'text-blue-700 bg-blue-50', icon: Sparkles }
    }
    if (q.status === 'completed') {
      return { label: '基础分析已完成', color: 'text-green-700 bg-green-50', icon: CheckCircle }
    }
    return { label: '请耐心等待 1～3 分钟', color: 'text-yellow-600 bg-yellow-50', icon: Clock }
  }

  const formatStatusTime = (q: UserQuestion, demo?: QuestionDemo) => {
    if (demo) return `生成于 ${formatDateTime(demo.createdAt)}`
    return formatDateTime(q.createdAt)
  }

  if (!isLoggedIn) return null

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-canvas-soft)]/95 backdrop-blur-md px-4 pt-3 pb-3">
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] border border-[var(--color-hairline)] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-base font-semibold text-[var(--color-ink)]">互动</h1>
              <p className="text-[10px] text-[var(--color-mute)] mt-0.5">共 {filteredQuestions.length} 条</p>
            </div>
            <button
              onClick={() => { setLoading(true); loadAll() }}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                text-[var(--color-body)] bg-[var(--color-canvas)] border border-[var(--color-hairline)]
                rounded-full hover:text-[var(--color-ink)] hover:border-[var(--color-mute)]
                disabled:opacity-40 transition-all cursor-pointer"
              title="刷新"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
            <input
              type="text"
              placeholder="搜索题目"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-full
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-link)] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-5 pt-4 pb-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-canvas-soft-2)] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[var(--color-mute)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-ink)] mb-1">还没有互动记录</p>
            <p className="text-xs text-[var(--color-mute)] mb-6">生成入口重写完成后，这里会显示你创建的内容</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--color-mute)]">
            没有匹配的题目
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const demos = demosMap[q.id] || []
            const latestDemo = demos[0]
            const st = getStatusMeta(q, demos)
            const StatusIcon = st.icon
            const canGenerateInteraction = q.status !== 'pending'
            const hasBasicInteraction = demos.some(isBasicInteractionDemo)
            const hasVividDemo = demos.some(isVividDemo)
            const vividPending = !hasVividDemo && (vividGeneratingId === q.id || isVividDemoPending(q.id))
            const generatedLabel = generateHint?.id === q.id ? generateHint.text : ''
            return (
              <div
                key={q.id}
                className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]"
              >
                <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-3 whitespace-pre-wrap mb-3">
                  {q.questionText}
                </p>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={`inline-flex items-center gap-1 shrink-0 text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--color-mute)] whitespace-nowrap">
                      {q.status === 'completed' && demos.length > 0 && latestDemo
                        ? formatStatusTime(q, latestDemo)
                        : formatStatusTime(q)}
                    </span>
                  </div>
                  {canGenerateInteraction && (
                    <div className="flex shrink-0 items-center gap-2">
                      {!hasBasicInteraction && (
                        <button
                          onClick={() => handleGenerateInteraction(q)}
                          disabled={generatingId === q.id}
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-white rounded-full
                            bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                            hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${generatingId === q.id ? 'animate-spin' : ''}`} />
                          {generatingId === q.id ? '生成中...' : '生成基础互动'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGenerateVividDemo(q)}
                        disabled={vividPending}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-medium text-blue-600 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Sparkles className={`h-3 w-3 ${vividPending ? 'animate-pulse' : ''}`} />
                        {vividPending ? '生成中...' : hasVividDemo ? '再次演示' : '演示'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--color-hairline)]">
                  <div className="flex flex-wrap items-center gap-2">
                    {demos.length > 0 ? demos.map((demo) => (
                      <div
                        key={demo.id}
                        className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-2 py-1"
                      >
                        <button
                          onClick={() => openDemo(demo.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                            text-[var(--color-link)] bg-[var(--color-link-bg-soft)]
                            rounded-full hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]
                            transition-all duration-200 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          观看 {getDemoDisplayTitle(demo)}
                        </button>
                        <button
                          onClick={() => void handleDownloadDemo(demo)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                            text-[var(--color-body)] bg-white border border-[var(--color-hairline)]
                            rounded-full hover:border-[var(--color-mute)] hover:text-[var(--color-ink)]
                            transition-all duration-200 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          下载
                        </button>
                      </div>
                    )) : !canGenerateInteraction && (
                      <span className="text-[10px] text-[var(--color-mute)] self-center">暂无演示动画</span>
                    )}
                  </div>
                  {generatedLabel && (
                    <p className="mt-2 text-[10px] text-[var(--color-mute)]">{generatedLabel}</p>
                  )}
                </div>
            </div>
          )
          })
        )}
      </div>

    </div>
  )
}
