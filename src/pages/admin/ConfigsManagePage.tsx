import { useState, useEffect } from 'react'
import { useAuth } from '../../stores/authStore'
import { authedRequest } from '../../lib/supabase-auth'
import { Button } from '../../components/ui/Button'
import { Pencil, Check, X, Settings, Plus } from 'lucide-react'

interface ConfigItem {
  key: string
  value: string
  description: string
}

export default function ConfigsManagePage() {
  const { isAdmin } = useAuth()
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 编辑状态
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // 新增状态
  const [showNewForm, setShowNewForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    loadConfigs()
  }, [isAdmin])

  async function loadConfigs() {
    setLoading(true)
    const { data } = await authedRequest<any[]>('/configs?order=key.asc')
    const items: ConfigItem[] = (data || []).map((r: any) => ({
      key: r.key,
      value: r.value || '',
      description: r.description || '',
    }))
    setConfigs(items)
    setLoading(false)
  }

  const startEdit = (item: ConfigItem) => {
    setEditingKey(item.key)
    setEditValue(item.value)
    setEditDescription(item.description)
  }

  const handleSaveEdit = async () => {
    if (!editingKey) return
    setSaving(true)
    try {
      await authedRequest(`/configs?key=eq.${editingKey}`, {
        method: 'PATCH',
        body: { value: editValue, description: editDescription },
      })
      setEditingKey(null)
      await loadConfigs()
    } catch {
      alert('保存失败')
    }
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditingKey(null)
  }

  const handleAdd = async () => {
    if (!newKey.trim()) return
    setSaving(true)
    try {
      await authedRequest('/configs', {
        method: 'POST',
        body: { key: newKey.trim(), value: newValue, description: newDescription },
      })
      setNewKey('')
      setNewValue('')
      setNewDescription('')
      setShowNewForm(false)
      await loadConfigs()
    } catch {
      alert('创建失败')
    }
    setSaving(false)
  }



  if (!isAdmin) return null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">系统配置</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowNewForm(true)}>
          <Plus className="w-4 h-4" />
          新增配置
        </Button>
      </div>

      {/* Inline new config form */}
      {showNewForm && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              placeholder="配置键名（如 temp）"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              autoFocus
              className="h-10 px-4 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono
                focus:outline-none focus:border-[var(--color-link)] transition-colors"
            />
            <input
              placeholder="配置描述（可选）"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="h-10 px-4 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-link)] transition-colors"
            />
          </div>
          <textarea
            placeholder="配置值..."
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            rows={5}
            className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
              text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
              focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button variant="secondary" size="sm" onClick={() => { setShowNewForm(false); setNewKey(''); setNewValue(''); setNewDescription('') }}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newKey.trim() || saving}>
              创建
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--color-mute)] bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-12">
          暂无配置数据
        </div>
      ) : (
        /* Table */
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-hairline)]">
                <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">键名</th>
                <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">描述</th>
                <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">值</th>
                <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((item) => (
                <tr key={item.key} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                  <td className="px-4 py-3 text-sm text-[var(--color-ink)] font-mono font-medium">{item.key}</td>

                  <td className="px-4 py-3">
                    {editingKey === item.key ? (
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="描述"
                        className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]"
                      />
                    ) : (
                      <span className="text-xs text-[var(--color-mute)]">{item.description}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingKey === item.key ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={4}
                        className="w-full px-2 py-1 text-xs bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] font-mono resize-y"
                      />
                    ) : (
                      <div className="max-w-md">
                        <pre className="text-xs text-[var(--color-body)] leading-relaxed line-clamp-3 whitespace-pre-wrap font-mono">
                          {item.value || <span className="text-[var(--color-mute)] italic">（空）</span>}
                        </pre>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {editingKey === item.key ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleSaveEdit}
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
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
