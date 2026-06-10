import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuestions, getTypes, addQuestion, updateQuestion, subscribe } from '../../stores/appStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Plus, X, Save, Send, Upload, GripVertical } from 'lucide-react'
import { GRADES } from '../../types'
import type { QuestionForm, HtmlDemo } from '../../types'

const defaultForm: QuestionForm = {
  title: '',
  subject: '数学',
  grade: '',
  typeId: '',
  tags: [],
  question: '',
  markdown: '',
  images: [],
  htmlDemos: [],
  status: 'draft',
}

export default function LessonEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const isEdit = Boolean(id)

  const [form, setForm] = useState<QuestionForm>(defaultForm)

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      const question = getQuestions().find((q) => q.id === id)
      if (question) {
        setForm({
          title: question.title,
          subject: question.subject,
          grade: question.grade,
          typeId: question.typeId,
          tags: question.tags,
          question: question.question,
          markdown: question.content.markdown,
          images: question.images,
          htmlDemos: question.htmlDemos,
          status: question.status,
        })
      }
    }
  }, [id, isEdit])

  const types = getTypes()
  const allTags = [
    ...new Set(
      getQuestions()
        .flatMap((q) => q.tags)
        .concat(['沪教版', '期末复习', '应用题', '易错题', '重量问题', '两端都种', '环形植树', '差量问题', '期中考试', '行程问题'])
    ),
  ].sort()

  const update = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  const addDemo = () => {
    update('htmlDemos', [...form.htmlDemos, { title: '', url: '' }])
  }

  const updateDemo = (index: number, field: keyof HtmlDemo, value: string) => {
    const demos = [...form.htmlDemos]
    demos[index] = { ...demos[index], [field]: value }
    update('htmlDemos', demos)
  }

  const removeDemo = (index: number) => {
    update(
      'htmlDemos',
      form.htmlDemos.filter((_, i) => i !== index)
    )
  }

  const addImage = () => {
    // Placeholder: in real app this would open a file picker
    update('images', [...form.images, '/assets/placeholder.png'])
  }

  const removeImage = (index: number) => {
    update(
      'images',
      form.images.filter((_, i) => i !== index)
    )
  }

  const save = (status: 'draft' | 'published') => {
    const data = { ...form, status }

    if (!data.title.trim()) {
      alert('请输入题目标题')
      return
    }

    if (isEdit && id) {
      updateQuestion(id, data)
    } else {
      addQuestion(data)
    }
    navigate('/admin/lessons')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-lg font-semibold text-[var(--color-ink)] mb-6">
        {isEdit ? '编辑题目' : '新增题目'}
      </h1>

      <div className="space-y-8">
        {/* Section 1: Basic Info */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">基础信息</h2>
          <div className="space-y-4">
            <Input
              label="标题"
              placeholder="输入题目标题"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-body)]">科目</label>
                <select
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  className="h-10 px-3 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]
                    text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                >
                  <option value="数学">数学</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-body)]">年级</label>
                <select
                  value={form.grade}
                  onChange={(e) => update('grade', e.target.value)}
                  className="h-10 px-3 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]
                    text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                >
                  <option value="">请选择年级</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-body)]">题型</label>
                <select
                  value={form.typeId}
                  onChange={(e) => update('typeId', e.target.value)}
                  className="h-10 px-3 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]
                    text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                >
                  <option value="">请选择题型</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags multi-select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-body)]">标签</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const selected = form.tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[var(--color-link-bg-soft)] text-[var(--color-link)] border-[var(--color-link)]'
                          : 'bg-[var(--color-canvas)] text-[var(--color-body)] border-[var(--color-hairline)] hover:border-[var(--color-mute)]'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Question content */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">原题内容</h2>
          <div className="flex flex-col gap-1">
            <textarea
              placeholder="输入题目原文内容..."
              value={form.question}
              onChange={(e) => update('question', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
                transition-colors resize-y"
            />
          </div>
        </section>

        {/* Section 3: Markdown explanation */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">文字讲解</h2>
          <p className="text-xs text-[var(--color-mute)] mb-2">支持 Markdown 格式</p>
          <div className="flex flex-col gap-1">
            <textarea
              placeholder="输入Markdown格式的讲解内容..."
              value={form.markdown}
              onChange={(e) => update('markdown', e.target.value)}
              rows={12}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono
                focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
                transition-colors resize-y"
            />
          </div>
        </section>

        {/* Section 4: Images */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">图片资源</h2>
          <div className="space-y-3">
            {form.images.map((img, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[var(--color-canvas-soft)] rounded-[var(--radius-sm)]">
                <div className="w-16 h-16 bg-[var(--color-canvas)] rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--color-mute)] text-xs border border-[var(--color-hairline)]">
                  图片
                </div>
                <span className="text-xs text-[var(--color-body)] flex-1 truncate">{img}</span>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="p-1 rounded text-[var(--color-body)] hover:text-red-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addImage}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-body)] border border-dashed border-[var(--color-hairline)] rounded-[var(--radius-sm)] hover:border-[var(--color-mute)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              上传图片
            </button>
            <p className="text-xs text-[var(--color-mute)]">支持 PNG、JPG、WebP 格式，单张不超过 5MB</p>
          </div>
        </section>

        {/* Section 5: HTML Demos */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">HTML 演示</h2>
          <div className="space-y-3">
            {form.htmlDemos.map((demo, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[var(--color-canvas-soft)] rounded-[var(--radius-sm)]">
                <GripVertical className="w-4 h-4 mt-3 text-[var(--color-mute)] shrink-0" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="演示名称"
                    value={demo.title}
                    onChange={(e) => updateDemo(i, 'title', e.target.value)}
                  />
                  <Input
                    placeholder="演示链接或路径"
                    value={demo.url}
                    onChange={(e) => updateDemo(i, 'url', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeDemo(i)}
                  className="p-1 mt-1.5 rounded text-[var(--color-body)] hover:text-red-600 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addDemo}
              className="flex items-center gap-2 text-sm text-[var(--color-body)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              添加演示
            </button>
          </div>
        </section>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-[var(--color-hairline)]">
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin/lessons')}>
          取消
        </Button>
        <Button
          variant="secondary-sm"
          size="sm"
          onClick={() => save('draft')}
        >
          <Save className="w-4 h-4" />
          保存草稿
        </Button>
        <Button variant="primary" size="sm" onClick={() => save('published')}>
          <Send className="w-4 h-4" />
          发布题目
        </Button>
      </div>
    </div>
  )
}
