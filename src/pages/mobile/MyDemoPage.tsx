import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getUserQuestion } from '../../lib/user-questions'

export default function MyDemoPage() {
  const { questionId, demoIndex } = useParams<{ questionId: string; demoIndex: string }>()
  const navigate = useNavigate()
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!questionId || demoIndex === undefined) return
    loadDemo()
  }, [questionId, demoIndex])

  async function loadDemo() {
    if (!questionId || demoIndex === undefined) return
    const q = await getUserQuestion(questionId)
    const idx = parseInt(demoIndex, 10)
    const demo = q?.htmlDemos?.[idx]
    if (!demo?.url) {
      setNotFound(true)
      return
    }

    if (demo.url.startsWith('data:text/html')) {
      try {
        const encoded = demo.url.split(',')[1]
        setHtmlContent(decodeURIComponent(encoded))
      } catch {
        setNotFound(true)
      }
    } else {
      // 外部 URL 直接跳转
      window.location.href = demo.url
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
      {/* 返回按钮 */}
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
