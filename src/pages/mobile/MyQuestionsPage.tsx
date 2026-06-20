import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Sparkles, Clock, CheckCircle, Play, Download, Search, RefreshCw, Lock } from 'lucide-react'
import { getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
// import { optimizeDemo } from '../../lib/generate'
import { useAuth } from '../../stores/authStore'
import { canViewDemo } from '../../lib/supabase-auth'
import { Button } from '../../components/ui/Button'
import type { UserQuestion, QuestionDemo } from '../../types/auth'



export default function MyQuestionsPage() {
  const navigate = useNavigate()
  const { isLoggedIn, subscription } = useAuth()
  const [questions, setQuestions] = useState<UserQuestion[]>([])
  const [demosMap, setDemosMap] = useState<Record<string, QuestionDemo[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return questions
    const q = search.toLowerCase()
    return questions.filter(
      (item) =>
        item.questionText.toLowerCase().includes(q) ||
        (item.questionType && item.questionType.toLowerCase().includes(q))
    )
  }, [questions, search])

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
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">我的互动列表</h1>
          <button
            onClick={() => { setLoading(true); loadAll() }}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
              text-[var(--color-body)] bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)]
              rounded-full hover:text-[var(--color-ink)] hover:border-[var(--color-mute)]
              disabled:opacity-40 transition-all cursor-pointer"
            title="刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <p className="text-xs text-[var(--color-mute)] mt-1 mb-3">共 {filteredQuestions.length} 条</p>
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
          <input
            type="text"
            placeholder="搜索题目内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-full
              text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
              focus:outline-none focus:border-[var(--color-link)] transition-colors"
          />
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
            <p className="text-sm font-medium text-[var(--color-ink)] mb-1">还没有录入题目</p>
            <p className="text-xs text-[var(--color-mute)] mb-6">在首页录入题目后，会在这里显示</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/')}>
              <Sparkles className="w-4 h-4" />
              去录入题目
            </Button>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--color-mute)]">
            没有匹配的题目
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const demos = demosMap[q.id] || []
            const now = Date.now()
            const created = new Date(q.createdAt).getTime()
            const isRecent = (now - created) < 5 * 60 * 1000 // 5分钟内算"生成中"
            // 有演示 → 已生成；无演示+近期 → 生成中；无演示+超时 → 待生成
            const st = demos.length > 0
              ? { label: '已生成', color: 'text-green-700 bg-green-50', icon: CheckCircle }
              : isRecent
                ? { label: '生成中，请耐心等待 1～3 分钟', color: 'text-yellow-600 bg-yellow-50', icon: Clock }
                : { label: '待生成', color: 'text-yellow-600 bg-yellow-50', icon: Clock }
            const StatusIcon = st.icon
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

                {/* demos */}
                <div className="pt-2 border-t border-[var(--color-hairline)]">
                  <div className="flex flex-wrap gap-2">
                    {demos.length > 0 ? (
                      demos.map((demo) => (
                        <div key={demo.id} className="flex items-center gap-1.5">
                          {canViewDemo(subscription) ? (
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
                          ) : (
                            <button
                              onClick={() => navigate('/subscribe')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                                text-[var(--color-mute)] bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)]
                                rounded-full hover:text-[var(--color-link)] hover:border-[var(--color-link)]
                                transition-all duration-200 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              会员可看
                            </button>
                          )}
                          {canViewDemo(subscription) && (
                            <button
                              onClick={() => downloadHtml(demo.htmlUrl, demo.title || 'demo')}
                              className="p-1.5 rounded-full text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                              title="下载 HTML"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--color-mute)]">暂无演示动画</span>
                    )}
                  </div>
                </div>
            </div>
          )
          })
        )}
      </div>

    </div>
  )
}
