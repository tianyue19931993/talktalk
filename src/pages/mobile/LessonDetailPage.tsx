import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Maximize2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { getQuestions } from '../../stores/appStore'

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const questions = getQuestions()
  const question = questions.find((q) => q.id === id)

  if (!question) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-mute)]">
          <p className="text-base font-medium">题目未找到</p>
          <p className="text-sm mt-1">该题目可能已被删除或链接有误</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      {/* Fixed back button */}
      <button
        onClick={() => navigate(-1)}
        className="sticky top-0 z-10 inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer bg-[var(--color-canvas-soft)] py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* Basic Info */}
      <section>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-mute)] mb-2">
          <span>{question.grade}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-hairline)]" />
          <span>{question.typeName}</span>
        </div>
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
      </section>

      {/* Original Question */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">原题</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]">
          <p className="text-sm text-[var(--color-body)] leading-relaxed whitespace-pre-wrap">{question.question}</p>
        </div>
      </section>

      {/* Image Explanation — always visible */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">图片资源</h2>
        {question.images && question.images.length > 0 ? (
          <div className="flex flex-col gap-3">
            {question.images.map((img, i) => (
              <div
                key={i}
                className="relative bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] overflow-hidden cursor-pointer group border border-[var(--color-hairline)]"
                onClick={() => setLightboxImage(img)}
              >
                <img
                  src={img}
                  alt={`讲解图片 ${i + 1}`}
                  className="w-full h-auto object-contain max-h-80"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                  <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 border border-dashed border-[var(--color-hairline)]">
            <p className="text-sm text-[var(--color-mute)] text-center">暂无图片资源</p>
          </div>
        )}
      </section>

      {/* HTML Interactive Demo — always visible */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">互动演示</h2>
        {question.htmlDemos && question.htmlDemos.length > 0 ? (
          <div className="flex flex-col gap-3">
            {question.htmlDemos.map((demo, i) => (
              <button
                key={i}
                onClick={() => navigate(`/demo/${question.id}/${i}`)}
                className="w-full py-3 px-5 bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] text-white text-sm font-medium rounded-full shadow-[0_2px_12px_rgba(121,40,202,0.2)] hover:shadow-[0_4px_20px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                查看演示动画
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 border border-dashed border-[var(--color-hairline)]">
            <p className="text-sm text-[var(--color-mute)] text-center">暂无演示动画</p>
          </div>
        )}
      </section>

      {/* Text Explanation (Markdown) — moved below */}
      {question.content?.markdown && (
        <section className="relative">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">讲解</h2>
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)] overflow-hidden relative">
            {/* Brand gradient accent bar at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-gradient-start)] via-[var(--color-highlight-pink)] to-[var(--color-cyan)] rounded-t-[var(--radius-2xl)]" />
            <div className="prose prose-sm max-w-none prose-headings:text-[var(--color-ink)] prose-headings:font-semibold prose-p:text-[var(--color-body)] prose-p:leading-relaxed prose-code:text-[var(--color-gradient-start)] prose-code:bg-[var(--color-canvas-soft)] prose-code:px-1 prose-code:rounded prose-pre:bg-[var(--color-canvas-soft-2)] prose-pre:rounded-[var(--radius-md)] prose-pre:border prose-pre:border-[var(--color-hairline)] mt-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {question.content.markdown}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Lightbox overlay */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="放大预览"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  )
}
