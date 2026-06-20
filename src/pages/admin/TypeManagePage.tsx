import { useState, useEffect } from 'react'
import { getTypes, addType, updateType, deleteType, subscribe } from '../../stores/appStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Plus, Pencil, Trash2, Check, X, BookType, FileText } from 'lucide-react'
import type { QuestionType } from '../../types'

export default function TypeManagePage() {
  const [, setTick] = useState(0)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAnalysisPrompt, setNewAnalysisPrompt] = useState('')
  const [newHtmlPrompt, setNewHtmlPrompt] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editAnalysisPrompt, setEditAnalysisPrompt] = useState('')
  const [editHtmlPrompt, setEditHtmlPrompt] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<QuestionType | null>(null)

  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchText, setBatchText] = useState('')

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  const types = getTypes()

  const handleAdd = () => {
    if (!newName.trim()) return
    addType({
      name: newName.trim(),
      description: newDesc.trim(),
      analysisPrompt: newAnalysisPrompt.trim(),
      htmlPrompt: newHtmlPrompt.trim(),
    })
    setNewName('')
    setNewDesc('')
    setNewAnalysisPrompt('')
    setNewHtmlPrompt('')
    setShowNewForm(false)
  }

  const startEdit = (t: QuestionType) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditDesc(t.description || '')
    setEditAnalysisPrompt(t.analysisPrompt || '')
    setEditHtmlPrompt(t.htmlPrompt || '')
  }

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return
    updateType(editingId, {
      name: editName.trim(),
      description: editDesc.trim(),
      analysisPrompt: editAnalysisPrompt.trim(),
      htmlPrompt: editHtmlPrompt.trim(),
    })
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDiscoveryFlow('')
    setEditInteractionFlow('')
    setEditAnimationFlow('')
  }

  const handleDelete = () => {
    if (deleteTarget) {
      deleteType(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookType className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">题型管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowBatchForm(true)}>
            <FileText className="w-4 h-4" />
            批量新增题型
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowNewForm(true)}>
            <Plus className="w-4 h-4" />
            新增题型
          </Button>
        </div>
      </div>

      {/* Inline new type form */}
      {showNewForm && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="题型名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="题型描述（可选）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 mb-3">
            <textarea
              placeholder="题目分析 prompt（可选）"
              value={newAnalysisPrompt}
              onChange={(e) => setNewAnalysisPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
            <div className="flex flex-col gap-1 mb-1">
              <label className="text-xs font-medium text-[var(--color-body)]">HTML prompt</label>
            </div>
            <textarea
              placeholder="给 AI 的 HTML 生成提示词，系统会自动传入分析数据"
              value={newHtmlPrompt}
              onChange={(e) => setNewHtmlPrompt(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>

          {/* 三个流程字段 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-body)]">🧠 discovery_flow（思维引导）</label>
            <textarea
              placeholder="设计孩子脑子里的路..."
              value={newDiscoveryFlow}
              onChange={(e) => setNewDiscoveryFlow(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-body)]">👆 interaction_flow（交互操作）</label>
            <textarea
              placeholder="设计孩子手上的路..."
              value={newInteractionFlow}
              onChange={(e) => setNewInteractionFlow(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-body)]">👀 animation_flow（视觉呈现）</label>
            <textarea
              placeholder="设计孩子眼睛看到的路..."
              value={newAnimationFlow}
              onChange={(e) => setNewAnimationFlow(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc(''); setNewAnalysisPrompt(''); setNewHtmlPrompt('') }}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              创建
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">题型名称</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-12 text-sm text-[var(--color-mute)]">
                  暂无题型数据
                </td>
              </tr>
            ) : (
              types.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">

                  <td className="px-4 py-3">
                    {editingId === t.id ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]"
                          autoFocus
                        />
                        <input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="描述（可选）"
                          className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]"
                        />
                        <textarea
                          value={editAnalysisPrompt}
                          onChange={(e) => setEditAnalysisPrompt(e.target.value)}
                          placeholder="题目分析 prompt（可选）"
                          rows={2}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] font-mono resize-y"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--color-mute)]">HTML prompt</span>
                        </div>
                        <textarea
                          value={editHtmlPrompt}
                          onChange={(e) => setEditHtmlPrompt(e.target.value)}
                          placeholder="给 AI 的 HTML 生成提示词"
                          rows={4}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] font-mono resize-y"
                        />
                        <textarea
                          value={editDiscoveryFlow}
                          onChange={(e) => setEditDiscoveryFlow(e.target.value)}
                          placeholder="🧠 discovery_flow（思维引导）"
                          rows={1}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] font-mono resize-y"
                        />
                        <textarea
                          value={editInteractionFlow}
                          onChange={(e) => setEditInteractionFlow(e.target.value)}
                          placeholder="👆 interaction_flow（交互操作）"
                          rows={1}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] font-mono resize-y"
                        />
                        <textarea
                          value={editAnimationFlow}
                          onChange={(e) => setEditAnimationFlow(e.target.value)}
                          placeholder="👀 animation_flow（视觉呈现）"
                          rows={1}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] font-mono resize-y"
                        />
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm text-[var(--color-ink)] font-medium">{t.name}</span>
                        {t.description && (
                          <p className="text-xs text-[var(--color-mute)] mt-0.5">{t.description}</p>
                        )}
                      </div>
                    )}
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

      {/* Batch add modal */}
      {showBatchForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] p-6 max-w-lg w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">批量新增题型</h3>
            <p className="text-xs text-[var(--color-mute)] mb-4">每行或每个中文分号（；）分隔一个题型名称</p>
            <textarea
              placeholder={`沪教版；\n期末复习；\n应用题；\n易错题；\n重量问题；\n两端都种`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
                transition-colors resize-y"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => { setShowBatchForm(false); setBatchText('') }}>
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                const names = batchText
                  .replace(/\\n/g, '\n')
                  .split(/[；;\n]+/)
                  .map(s => s.trim())
                  .filter(Boolean)
                names.forEach(name => {
                  addType({ name, description: '' })
                })
                setShowBatchForm(false)
                setBatchText('')
              }}>
                批量创建 ({batchText.split(/[；;\n]+/).map(s => s.trim()).filter(Boolean).length} 个)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">确认删除</h3>
            <p className="text-sm text-[var(--color-body)] mb-1">
              确定要删除题型「{deleteTarget.name}」吗？
            </p>
            <p className="text-xs text-[var(--color-mute)] mb-6">
              删除后，使用此题型的题目将变为未指定题型。
            </p>
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
