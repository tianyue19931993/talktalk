import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuestions, getTypes, getTags, addQuestion, updateQuestion, subscribe } from '../../stores/appStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Plus, X, Save, Send, Upload, GripVertical, Search } from 'lucide-react'
import { GRADES } from '../../types'
import type { QuestionForm, HtmlDemo } from '../../types'

const defaultForm: QuestionForm = {
  title: '',
  subject: '数学',
  grade: '',
  typeId: '',
  tags: [],
  question: '',
  htmlDemos: [],
  status: 'draft',
}

export default function LessonEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const isEdit = Boolean(id)

  const [form, setForm] = useState<QuestionForm>(defaultForm)
  const [tagSearch, setTagSearch] = useState('')

  const uploadHtmlDemo = (index: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async () => {
        const content = reader.result as string
        // 尝试上传到 Kodo
        let url = ''
        try {
          const res = await fetch('/api/upload/html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              type: 'admin',
              refId: id || 'new',
            }),
          })
          const data = await res.json()
          if (data.success && data.url) url = data.url
        } catch { /* 静默降级到 data:URL */ }
        if (!url) {
          url = 'data:text/html;charset=utf-8,' + encodeURIComponent(content)
        }
        const demos = [...form.htmlDemos]
        demos[index] = { ...demos[index], url }
        update('htmlDemos', demos)
      }
      reader.readAsText(file)
    }
    input.click()
  }

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
          htmlDemos: question.htmlDemos,
          status: question.status,
        })
      }
    }
  }, [id, isEdit])

  const types = getTypes()
  const allTags = getTags().map((t) => t.name)

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

  const save = (status: 'draft' | 'published') => {
    const data = { ...form, status }

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
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">基础信息</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-body)]">科目</label>
                <select
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  className="h-10 px-4 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
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
                  className="h-10 px-4 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
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
                  className="h-10 px-4 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                    text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                >
                  <option value="">请选择题型</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags - search + multi-select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-body)]">标签</label>
              
              {/* Selected tags */}
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-[var(--color-link-bg-soft)] text-[var(--color-link)]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="hover:opacity-60 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-mute)]" />
                <input
                  type="text"
                  placeholder="搜索标签..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                    text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                    focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                />
              </div>

              {/* Filtered tag list */}
              <div className="flex flex-wrap gap-1.5">
                {allTags
                  .filter((tag) => !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase()))
                  .filter((tag) => !form.tags.includes(tag))
                  .slice(0, 30)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { toggleTag(tag); setTagSearch('') }}
                      className="px-2.5 py-0.5 text-xs rounded-full border border-[var(--color-hairline)] text-[var(--color-body)]
                        hover:border-[var(--color-link)] hover:text-[var(--color-link)] hover:bg-[var(--color-link-bg-soft)] transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                {allTags.filter((tag) => !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase()))
                  .filter((tag) => !form.tags.includes(tag)).length === 0 && tagSearch && (
                  <span className="text-xs text-[var(--color-mute)]">没有匹配的标签</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Question content */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">原题内容</h2>
          <div className="flex flex-col gap-1">
            <textarea
              placeholder="输入题目原文内容..."
              value={form.question}
              onChange={(e) => update('question', e.target.value)}
              rows={5}
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
                transition-colors resize-y"
            />
          </div>
        </section>

        {/* Section 3: HTML Demos */}
        <section className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4">HTML 演示</h2>
          <div className="space-y-3">
            {form.htmlDemos.map((demo, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[var(--color-canvas-soft)] rounded-[var(--radius-sm)]">
                <GripVertical className="w-4 h-4 mt-3 text-[var(--color-mute)] shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  {demo.url && demo.url.startsWith('data:text/html') ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-success)] bg-green-50 px-2 py-0.5 rounded-full">已上传 HTML 文件</span>
                        <button
                          type="button"
                          onClick={() => {
                            const previewWindow = window.open('', '_blank')
                            if (previewWindow) {
                              const html = decodeURIComponent(demo.url.split(',')[1] || '')
                              previewWindow.document.write(html)
                              previewWindow.document.close()
                            }
                          }}
                          className="text-xs text-[var(--color-link)] hover:underline cursor-pointer"
                        >
                          预览
                        </button>
                      </div>
                      <span className="text-xs text-[var(--color-mute)] truncate">{demo.url.slice(0, 60)}...</span>
                    </>
                  ) : (
                    <Input
                      placeholder="演示链接或路径（外部 URL）"
                      value={demo.url}
                      onChange={(e) => updateDemo(i, 'url', e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => uploadHtmlDemo(i)}
                    className="flex items-center gap-1.5 text-xs text-[var(--color-link)] hover:text-[var(--color-link)]/80 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {demo.url && demo.url.startsWith('data:text/html') ? '重新上传 HTML 文件' : '上传 HTML 文件'}
                  </button>
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
