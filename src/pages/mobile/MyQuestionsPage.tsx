import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Sparkles, Clock, CheckCircle, Play, Download, Loader2 } from 'lucide-react'
import { getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
import { generateDemo } from '../../lib/generate'
import { useAuth } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待生成', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  completed: { label: '已生成', color: 'text-green-700 bg-green-50', icon: CheckCircle },
  uploaded: { label: '已上传', color: 'text-blue-700 bg-blue-50', icon: CheckCircle },
}

export default function MyQuestionsPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [questions, setQuestions] = useState<UserQuestion[]>([])
  const [demosMap, setDemosMap] = useState<Record<string, QuestionDemo[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login?redirect=/my/questions')
      return
    }
    loadAll()
  }, [isLoggedIn])

  async function loadAll() {
    setLoading(true)
    const list = await getMyQuestions()
    setQuestions(list)

    // 并行加载每个题目的 demos
    const map: Record<string, QuestionDemo[]> = {}
    await Promise.all(
      list.map(async (q) => {
        map[q.id] = await getQuestionDemos(q.id)
      })
    )
    setDemosMap(map)
    setLoading(false)
  }

  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({})

  const handleRegenerate = async (questionId: string) => {
    setRegenerating((prev) => ({ ...prev, [questionId]: true }))
    try {
      const result = await generateDemo(questionId, { regenerate: true })
      if (result.success) {
        await loadAll()
      } else if (result.timedOut) {
        alert('生成超时，请稍后重试')
      } else if (result.error?.includes('没有匹配到合适的题型')) {
        alert('没有匹配到合适的题型，请联系客服')
      } else {
        alert(result.error || '生成失败，请重试')
      }
    } catch {
      alert('生成失败，请重试')
    } finally {
      setRegenerating((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const downloadHtml = (url: string, label: string) => {
    const link = document.createElement('a')
    if (url.startsWith('data:text/html')) {
      const content = decodeURIComponent(url.split(',')[1] || '')
      const blob = new Blob([content], { type: 'text/html' })
      link.href = URL.createObjectURL(blob)
    } else {
      link.href = url
    }
    link.download = `${label || 'demo'}.html`
    link.click()
  }

  if (!isLoggedIn) return null

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-[var(--color-canvas)] px-5 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-body)] hover:text-[var(--color-ink)] mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">我的互动列表</h1>
        <p className="text-xs text-[var(--color-mute)] mt-1">共 {questions.length} 条</p>
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
            <p className="text-sm font-medium text-[var(--color-ink)] mb-1">还没有录入题目</p>
            <p className="text-xs text-[var(--color-mute)] mb-6">在首页录入题目后，会在这里显示</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/')}>
              <Sparkles className="w-4 h-4" />
              去录入题目
            </Button>
          </div>
        ) : (
          questions.map((q) => {
            const st = STATUS_MAP[q.status] || STATUS_MAP.pending
            const StatusIcon = st.icon
            const demos = demosMap[q.id] || []
            return (
              <div
                key={q.id}
                className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]"
              >
                <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-3 whitespace-pre-wrap mb-3">
                  {q.questionText}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {st.label}
                  </span>
                  <span className="text-[10px] text-[var(--color-mute)]">
                    {new Date(q.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                {/* demos + 重新生成 */}
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-[var(--color-hairline)]">
                  <div className="flex flex-wrap gap-2 flex-1">
                    {demos.length > 0 ? (
                      demos.map((demo) => (
                        <div key={demo.id} className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/my/demo/${demo.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                              text-[var(--color-link)] bg-[var(--color-link-bg-soft)]
                              rounded-full hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]
                              transition-all duration-200 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            观看 {demo.title || '演示'}
                          </button>
                          <button
                            onClick={() => downloadHtml(demo.htmlUrl, demo.title || 'demo')}
                            className="p-1.5 rounded-full text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                            title="下载 HTML"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--color-mute)]">暂无演示动画</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRegenerate(q.id)}
                    disabled={regenerating[q.id]}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium shrink-0
                      text-[var(--color-link)] bg-[var(--color-link-bg-soft)] rounded-full
                      hover:bg-blue-100 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {regenerating[q.id] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {regenerating[q.id] ? '生成中...' : '重新生成'}
                  </button>
                </div>
            </div>
          )
          })
        )}
      </div>
    </div>
  )
}
