import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function MyDemoPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const navigate = useNavigate()
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!demoId) return
    loadDemo()
  }, [demoId])

  async function loadDemo() {
    if (!demoId) return

    // 通过 authedRequest 从 question_demos 读取
    const { authedRequest } = await import('../../lib/supabase-auth')
    const { data } = await authedRequest<any[]>(`/question_demos?id=eq.${demoId}`)
    const demo = data?.[0]
    if (!demo?.html_url) {
      setNotFound(true)
      return
    }

    if (demo.html_url.startsWith('data:text/html')) {
      try {
        const encoded = demo.html_url.split(',')[1]
        setHtmlContent(decodeURIComponent(encoded))
      } catch {
        setNotFound(true)
      }
    } else {
      window.location.href = demo.html_url
    }
  }

  if (notFound) {
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
    </div>
  )
}
