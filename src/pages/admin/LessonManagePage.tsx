import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQuestions, deleteQuestion, subscribe } from '../../stores/appStore'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SearchInput } from '../../components/ui/Input'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import type { Question } from '../../types'

export default function LessonManagePage() {
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  const questions = getQuestions()

  const filtered = search
    ? questions.filter(
        (q) =>
          q.question.toLowerCase().includes(search.toLowerCase()) ||
          q.id.toLowerCase().includes(search.toLowerCase())
      )
    : questions

  const handleDelete = () => {
    if (deleteTarget) {
      deleteQuestion(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'published') {
      return <Badge variant="success">已发布</Badge>
    }
    return <Badge variant="warning">草稿</Badge>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">题目管理</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/admin/lesson/new')}>
          <Plus className="w-4 h-4" />
          新增题目
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          placeholder="搜索题目标题或ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">ID</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">题目</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">科目</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">年级</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">题型</th>

              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">状态</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">更新时间</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm text-[var(--color-mute)]">
                  暂无题目数据
                </td>
              </tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                  <td className="px-4 py-3 text-xs text-[var(--color-mute)] font-mono">{q.id}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-ink)] max-w-[200px] truncate">{q.question}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-body)]">{q.subject}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-body)]">{q.grade}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-body)]">{q.typeName || '-'}</td>

                  <td className="px-4 py-3">{statusBadge(q.status)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-mute)]">{q.updatedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/admin/lesson/edit/${q.id}`)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(q)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--color-mute)] bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-6">
            暂无题目数据
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-[var(--color-ink)] line-clamp-2">{q.question}</h3>
                  <p className="text-xs text-[var(--color-mute)] font-mono mt-0.5">{q.id}</p>
                </div>
                {statusBadge(q.status)}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-body)] mb-3">
                <span>{q.subject}</span>
                <span className="text-[var(--color-hairline)]">·</span>
                <span>{q.grade}</span>
                <span className="text-[var(--color-hairline)]">·</span>
                <span>{q.typeName || '-'}</span>

              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-mute)]">更新于 {q.updatedAt}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/admin/lesson/edit/${q.id}`)}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(q)}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">确认删除</h3>
            <p className="text-sm text-[var(--color-body)] mb-1">
              确定要删除题目「{deleteTarget.title}」吗？
            </p>
            <p className="text-xs text-[var(--color-mute)] mb-6">此操作不可撤销。</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
