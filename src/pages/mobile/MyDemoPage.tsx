import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Crown } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { canViewDemo } from '../../lib/supabase-auth'
import { Button } from '../../components/ui/Button'

export default function MyDemoPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const navigate = useNavigate()
  const { subscription, isLoggedIn, isLoading } = useAuth()
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  // 权限检查：需要有效订阅
  const hasAccess = isLoggedIn && canViewDemo(subscription)

  useEffect(() => {
    if (!demoId || !hasAccess || isLoading) return
    loadDemo()
  }, [demoId, hasAccess, isLoading])

  async function loadDemo() {
    if (!demoId) return

    // 通过 authedRequest 从 question_demos 读取
    const { authedRequest } = await import('../../lib/supabase-auth')
    const { data } = await authedRequest<any[]>(`/question_demos?id=eq.${demoId}`)
    const demo = data?.[0]
    if (!demo?.html_url) {
      setLoadState('notfound')
      return
    }

    const url = demo.html_url

    if (url.startsWith('data:text/html')) {
      // data:URL → 解码后用 srcdoc 渲染
      try {
        const encoded = url.split(',')[1]
        setHtmlContent(decodeURIComponent(encoded))
        setLoadState('ready')
      } catch {
        setLoadState('notfound')
      }
    } else if (url.startsWith('http')) {
      // Kodo URL → 获取内容后用 srcdoc 渲染（避免跨域 iframe 限制）
      try {
        const res = await fetch(url)
        if (!res.ok) { setLoadState('notfound'); return }
        const content = await res.text()
        setHtmlContent(content)
        setLoadState('ready')
      } catch {
        // 如果 fetch 失败（CORS 未配置），退而直接用 iframe src
        setHtmlUrl(url)
        setLoadState('ready')
      }
    } else {
      setLoadState('notfound')
    }
  }

  // 权限不足 → 锁定页面
  if (!isLoading && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)] p-4">
        <button
          onClick={() => navigate(-1)}
          className="self-start mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-8 border border-[var(--color-hairline)] text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-canvas-soft-2)] flex items-center justify-center">
            <Lock className="w-7 h-7 text-[var(--color-mute)]" />
          </div>
          <p className="text-base font-semibold text-[var(--color-ink)] mb-1">互动演示已锁定</p>
          <p className="text-sm text-[var(--color-mute)] mb-5">开通会员后即可查看全部互动演示</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(isLoggedIn ? '/subscribe' : '/login')}
          >
            <Crown className="w-4 h-4" />
            {isLoggedIn ? '开通会员' : '登录开通'}
          </Button>
        </div>
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-canvas-soft)]">
        <p className="text-sm text-[var(--color-mute)]">加载中...</p>
      </div>
    )
  }

  if (loadState === 'notfound') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)] p-4">
        <div className="flex flex-col items-center gap-2 text-[var(--color-mute)]">
          <p className="text-base font-medium">演示未找到</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[var(--color-link)] hover:underline cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-white relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        返回
      </button>

      {htmlContent && (
        <iframe
          srcDoc={htmlContent}
          title="演示"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          allowFullScreen
        />
      )}
      {htmlUrl && (
        <iframe
          src={htmlUrl}
          title="演示"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          allowFullScreen
        />
      )}
    </div>
  )
}
