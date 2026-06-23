import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Sparkles, Clock, CheckCircle, Play, Download, Search, RefreshCw } from 'lucide-react'
import { getMyQuestions, getQuestionDemosBatch } from '../../lib/user-questions'
// import { optimizeDemo } from '../../lib/generate'
import { useAuth } from '../../stores/authStore'
import { generateDemo } from '../../lib/generate'
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
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())
  const [regenNotice, setRegenNotice] = useState('')

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
    loadAll()
  }, [isLoggedIn, navigate])

  async function loadAll() {
    setLoading(true)
    const list = await getMyQuestions()
    setQuestions(list)

    const map = await getQuestionDemosBatch(list.map((q) => q.id))
    setDemosMap(map)
    setLoading(false)
  }

  async function handleRegenerate(q: UserQuestion) {
    setRegenNotice('正在生成中，请耐心等待 1～3 分钟，后刷新页面查看。')
    window.alert('正在生成中，请耐心等待 1～3 分钟，后刷新页面查看。')
    setRegenerating(prev => new Set(prev).add(q.id))
    try {
      const result = await generateDemo(q.id, { type: 'regenerate' })
      if (result.timedOut || result.error === 'timeout') {
        // 超时但后端可能还在跑 → 不报错，提示用户稍等
        setTimeout(() => loadAll(), 5000)
        return
      }
      if (result.success) {
        await loadAll()
        setRegenNotice('已收到重新生成请求，正在更新列表...')
        setTimeout(() => setRegenNotice(''), 3000)
      } else if (!result.timedOut) {
        alert(result.error || '重新生成失败，请重试')
        setRegenNotice('')
      }
    } catch {
      // 网络错误也不弹窗，后端可能已接收请求
      setTimeout(() => loadAll(), 3000)
      setRegenNotice('请求已发出，稍后刷新查看结果')
    } finally {
      setRegenerating(prev => {
        const next = new Set(prev)
        next.delete(q.id)
        return next
      })
    }
  }

  const downloadHtml = async (url: string, label: string) => {
    try {
      let blobUrl: string | null = null
      if (url.startsWith('data:text/html')) {
        const content = decodeURIComponent(url.split(',')[1] || '')
        blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
      } else if (url.startsWith('http')) {
        // 七牛直链 → fetch 后下载（避免跨域问题）
        const res = await fetch(url, { mode: 'cors' })
        if (!res.ok) throw new Error(`下载失败: ${res.status}`)
        const content = await res.text()
        blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
      } else {
        return
      }
      const link = document.createElement('a')
      link.href = blobUrl || url
      link.download = `${label || 'demo'}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    } catch (e: any) {
      console.error('[downloadHtml]', e)
      alert('下载失败：' + (e.message || '未知错误'))
    }
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
          {regenNotice && (
            <div className="mb-3 rounded-[var(--radius-md)] border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {regenNotice}
            </div>
          )}
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
            <p className="text-sm font-medium text-[var(--color-ink)] mb-1">还没有生成</p>
            <p className="text-xs text-[var(--color-mute)] mb-6">在首页操作生成后，会在这里显示</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/')}>
              <Sparkles className="w-4 h-4" />
              去生成
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
            // 有演示 → 已生成；无演示 → 统一显示生成中，避免首页/列表状态不一致
            const st = demos.length > 0
              ? { label: '已生成', color: 'text-green-700 bg-green-50', icon: CheckCircle }
              : { label: '生成中，请耐心等待 1～3 分钟', color: 'text-yellow-600 bg-yellow-50', icon: Clock }
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
                    {demos.length > 0 && latestDemo
                      ? `生成于 ${formatDateTime(latestDemo.createdAt)}`
                      : `提交于 ${formatDateTime(q.createdAt)}`
                    }
                  </span>
                </div>

                {/* action buttons row: regenerate + demos */}
                <div className="pt-2 border-t border-[var(--color-hairline)]">
                  <div className="flex flex-wrap gap-2">
                    {/* 重新生成 — 始终显示 */}
                    <button
                      onClick={() => handleRegenerate(q)}
                      disabled={regenerating.has(q.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                        text-purple-600 bg-purple-50 border border-purple-200
                        rounded-full hover:bg-purple-100 hover:scale-[1.02] active:scale-[0.98]
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all duration-200 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${regenerating.has(q.id) ? 'animate-spin' : ''}`} />
                      重新生成
                    </button>

                    {/* demos */}
                    {demos.length > 0 ? (
                      demos.map((demo) => (
                        <React.Fragment key={demo.id}>
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
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--color-mute)] self-center">暂无演示动画</span>
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
