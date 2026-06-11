import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Eye, Trash2, Plus } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { Pagination } from '../../components/ui/Pagination'
import { getAllUserQuestions, updateUserQuestionDemos, adminUploadUserQuestionHtml } from '../../lib/user-questions'
import type { UserQuestion } from '../../types/auth'

const PAGE_SIZE = 20

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待生成', color: 'bg-yellow-50 text-yellow-700' },
  completed: { label: '已生成', color: 'bg-green-50 text-green-700' },
  uploaded: { label: '已上传', color: 'bg-blue-50 text-blue-700' },
}

export default function UserQuestionManagePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [questions, setQuestions] = useState<UserQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) { navigate('/admin/lessons'); return }
    loadData()
  }, [isAdmin])

  async function loadData() {
    setLoading(true)
    const data = await getAllUserQuestions()
    setQuestions(data)
    setLoading(false)
  }

  const handleUploadHtml = async (id: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await adminUploadUserQuestionHtml(id, file)
        await loadData()
      } catch {
        alert('上传失败')
      }
    }
    input.click()
  }

  const handleRemoveDemo = async (q: UserQuestion, demoIndex: number) => {
    const demos = q.htmlDemos.filter((_, i) => i !== demoIndex)
    await updateUserQuestionDemos(q.id, demos)
    await loadData()
  }

  const handlePreviewHtml = (url: string) => {
    if (url.startsWith('data:text/html')) {
      const html = decodeURIComponent(url.split(',')[1] || '')
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    } else {
      window.open(url, '_blank')
    }
  }

  const toggleExpand = (id: string) => {
    setEditingId(editingId === id ? null : id)
  }

  const filtered = useMemo(() => {
    const result = search
      ? questions.filter((q) => q.questionText.toLowerCase().includes(search.toLowerCase()))
      : questions
    return result
  }, [questions, search])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search])

  if (loading) return <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">用户题目管理</h1>
          <span className="text-xs text-[var(--color-mute)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-full">{filtered.length} 条</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
          <input
            placeholder="搜索题目内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-3 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-link)]"
          />
        </div>
      </div>

      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">题目</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">状态</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">演示数</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">提交时间</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm text-[var(--color-mute)]">暂无用户题目数据</td></tr>
            ) : (
              paginated.map((q) => {
                const st = STATUS_MAP[q.status] || STATUS_MAP.pending
                const isExpanded = editingId === q.id
                return (
                  <tr key={q.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--color-ink)] line-clamp-2 max-w-md">{q.questionText}</p>
                      <p className="text-xs text-[var(--color-mute)] font-mono mt-0.5">{q.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                      {q.htmlDemos?.length || 0} 个
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                      {new Date(q.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleExpand(q.id)}
                        className="p-1.5 rounded text-[var(--color-body)] hover:text-[var(--color-link)] hover:bg-[var(--color-link-bg-soft)] transition-colors cursor-pointer text-xs"
                        title="展开详情"
                      >
                        {isExpanded ? '收起' : '详情'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 展开的 HTML Demo 管理区域 */}
      {editingId && (() => {
        const q = questions.find((x) => x.id === editingId)
        if (!q) return null
        return (
          <div className="mt-4 bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">演示管理</h3>
              <button
                onClick={() => handleUploadHtml(q.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-full
                  bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                上传 HTML
              </button>
            </div>

            <p className="text-sm text-[var(--color-body)] mb-4 line-clamp-2">{q.questionText}</p>

            {q.htmlDemos.length === 0 ? (
              <p className="text-xs text-[var(--color-mute)] py-4 text-center">暂无演示，点击上方按钮上传</p>
            ) : (
              <div className="space-y-2">
                {q.htmlDemos.map((demo, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[var(--color-canvas-soft)] rounded-[var(--radius-md)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-[var(--color-body)] shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-[var(--color-ink)] truncate">
                        {demo.title || `演示 ${i + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handlePreviewHtml(demo.url)}
                        className="p-1.5 rounded text-[var(--color-body)] hover:text-[var(--color-link)] hover:bg-[var(--color-link-bg-soft)] transition-colors cursor-pointer"
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveDemo(q, i)}
                        className="p-1.5 rounded text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      <Pagination current={safePage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
