import { useState, useEffect } from 'react'
import { getTags, addTag, updateTag, deleteTag, subscribe } from '../../stores/appStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Plus, Pencil, Trash2, Check, X, Tags } from 'lucide-react'
import type { Tag } from '../../types'

export default function TagManagePage() {
  const [, setTick] = useState(0)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  const tags = getTags()

  const handleAdd = () => {
    if (!newName.trim()) return
    addTag(newName.trim())
    setNewName('')
    setShowNewForm(false)
  }

  const startEdit = (t: Tag) => {
    setEditingId(t.id)
    setEditName(t.name)
  }

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return
    updateTag(editingId, editName.trim())
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      deleteTag(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">标签管理</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowNewForm(true)}>
          <Plus className="w-4 h-4" />
          新增标签
        </Button>
      </div>

      {/* Inline new tag form */}
      {showNewForm && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4 mb-4 flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="标签名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setShowNewForm(false); setNewName('') }}>
            取消
          </Button>
          <Button variant="primary" size="sm" onClick={handleAdd}>
            创建
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">标签名称</th>
              <th className="text-center text-xs font-medium text-[var(--color-mute)] px-4 py-3">使用次数</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-sm text-[var(--color-mute)]">
                  暂无标签数据
                </td>
              </tr>
            ) : (
              tags.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                  <td className="px-4 py-3">
                    {editingId === t.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full max-w-xs px-2 py-1 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-[var(--color-ink)] font-medium">{t.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-canvas-soft)] text-[var(--color-body)]">
                      {t.count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === t.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleUpdate}
                          className="p-1.5 rounded-[var(--radius-sm)] text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                          title="保存"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l3)] p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">确认删除</h3>
            <p className="text-sm text-[var(--color-body)] mb-1">
              确定要删除标签「{deleteTarget.name}」吗？
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
