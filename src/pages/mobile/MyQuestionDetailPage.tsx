import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Clock, Play, Lock } from 'lucide-react'
import { getUserQuestion, getQuestionDemos } from '../../lib/user-questions'
import { useAuth } from '../../stores/authStore'
import { canViewDemo } from '../../lib/supabase-auth'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待生成', color: 'text-yellow-700 bg-yellow-50' },
  completed: { label: '已生成', color: 'text-green-700 bg-green-50' },
  uploaded: { label: '已上传', color: 'text-blue-700 bg-blue-50' },
}

export default function MyQuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { subscription, isLoggedIn } = useAuth()
  const hasDemoAccess = isLoggedIn && canViewDemo(subscription)
  const [question, setQuestion] = useState<UserQuestion | null>(null)
  const [demos, setDemos] = useState<QuestionDemo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadAll()
  }, [id])

  async function loadAll() {
    if (!id) return
    setLoading(true)
    const q = await getUserQuestion(id)
    setQuestion(q)
    if (q) {
      const d = await getQuestionDemos(q.id)
      setDemos(d)
    }
    setLoading(false)
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
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
            <span className="text-xs text-[var(--color-mute)]">提交于 {new Date(question.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">互动演示</h2>
        {demos.length > 0 ? (
          <div className="space-y-3">
            {demos.map((demo) => (
              <div key={demo.id} className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]">
                <p className="text-sm font-medium text-[var(--color-ink)] mb-3">{demo.title || '演示'}</p>
                <div className="flex items-center gap-3">
                  {hasDemoAccess ? (
                    <button
                      onClick={() => navigate(`/my/demo/${demo.id}`)}
                      className="inline-flex items-center gap-1.5 px-4 h-8 text-sm font-medium text-white rounded-full
                        bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                        shadow-[0_1px_4px_rgba(121,40,202,0.15)] hover:scale-[1.02] active:scale-[0.98]
                        transition-all duration-200 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />观看
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/subscribe')}
                      className="inline-flex items-center gap-1.5 px-4 h-8 text-sm font-medium
                        text-[var(--color-mute)] bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-full
                        hover:text-[var(--color-link)] hover:border-[var(--color-link)]
                        transition-all duration-200 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />会员可看
                    </button>
                  )}
                  <button
                    onClick={() => downloadHtml(demo.htmlUrl, demo.title || 'demo')}
                    className="inline-flex items-center gap-1 px-3 h-8 text-sm font-medium text-[var(--color-body)]
                      bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-full
                      hover:text-[var(--color-ink)] hover:border-[var(--color-mute)] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />下载
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
