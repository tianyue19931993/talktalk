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

  const hasImages = question.images && question.images.length > 0
  const hasDemos = question.htmlDemos && question.htmlDemos.length > 0

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
        <h1 className="text-lg font-bold text-[var(--color-ink)] mb-3">{question.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-mute)] mb-2">
          <span>{question.grade}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-hairline)]" />
          <span>{question.typeName}</span>
        </div>
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.tags.map((tag) => (
              <Badge key={tag} variant="primary">{tag}</Badge>
            ))}
          </div>
        )}
      </section>

      {/* Original Question */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-2">原题</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4">
          <p className="text-sm text-[var(--color-body)] leading-relaxed whitespace-pre-wrap">{question.question}</p>
        </div>
      </section>

      {/* Text Explanation (Markdown) */}
      {question.content?.markdown && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-2">讲解</h2>
          <div className="bg-white rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4">
            <div className="prose prose-sm max-w-none prose-headings:text-[var(--color-ink)] prose-p:text-[var(--color-body)] prose-code:text-[var(--color-primary)] prose-pre:bg-[var(--color-canvas-soft)] prose-pre:rounded-[var(--radius-sm)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {question.content.markdown}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Image Explanation */}
      {hasImages && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-2">图片讲解</h2>
          <div className="flex flex-col gap-3">
            {question.images.map((img, i) => (
              <div
                key={i}
                className="relative bg-[var(--color-canvas-soft)] rounded-[var(--radius-md)] overflow-hidden cursor-pointer group"
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
        </section>
      )}

      {/* HTML Interactive Demo */}
      {hasDemos && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-2">互动演示</h2>
          <div className="flex flex-col gap-2">
            {question.htmlDemos.map((demo, i) => (
              <Button
                key={i}
                variant="primary"
                onClick={() => navigate(`/demo/${question.id}/${i}`)}
              >
                {demo.title || `开始演示 ${i + 1}`}
              </Button>
            ))}
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
