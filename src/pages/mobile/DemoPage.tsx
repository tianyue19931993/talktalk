import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getQuestions } from '../../stores/appStore'

export default function DemoPage() {
  const { lessonId, demoId } = useParams<{ lessonId: string; demoId: string }>()
  const navigate = useNavigate()
  const [kodoContent, setKodoContent] = useState<string | null>(null)

  const questions = getQuestions()
  const question = questions.find((q) => q.id === lessonId)

  const demoIndex = demoId ? parseInt(demoId, 10) : -1
  const demo = question?.htmlDemos?.[demoIndex]

  // Decode data: URL → raw HTML for srcdoc (better mobile compatibility)
  const htmlContent = useMemo(() => {
    if (!demo?.url) return null
    if (demo.url.startsWith('data:text/html')) {
      try {
        const encoded = demo.url.split(',')[1]
        return decodeURIComponent(encoded)
      } catch {
        return null
      }
    }
    return null
  }, [demo])

  // Kodo URL → fetch 后用 srcdoc 渲染
  useEffect(() => {
    if (!demo?.url || demo.url.startsWith('data:text/html')) return
    if (!demo.url.startsWith('http')) return
    let cancelled = false
    fetch(demo.url)
      .then((r) => r.text())
      .then((content) => { if (!cancelled) setKodoContent(content) })
      .catch(() => { /* 降级到 iframe src */ })
    return () => { cancelled = true }
  }, [demo?.url])

  if (!demo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)] p-4">
        <div className="flex flex-col items-center gap-2 text-[var(--color-mute)]">
          <p className="text-base font-medium">演示未找到</p>
          <p className="text-sm">该演示内容可能已被移除</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-white relative">
      {/* Floating back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        返回
      </button>

      {/* srcdoc for uploaded HTML / Kodo content, src for external URLs */}
      {htmlContent || kodoContent ? (
        <iframe
          srcDoc={htmlContent || kodoContent}
          title="演示"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          allowFullScreen
        />
      ) : (
        <iframe
          src={demo.url}
          title="演示"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allowFullScreen
        />
      )}
    </div>
  )
}
