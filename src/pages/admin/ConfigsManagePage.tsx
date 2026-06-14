import { useState, useEffect } from 'react'
import { useAuth } from '../../stores/authStore'
import { authedRequest } from '../../lib/supabase-auth'
import { Button } from '../../components/ui/Button'
import { Save, Settings } from 'lucide-react'

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
  const [saved, setSaved] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

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
    const vals: Record<string, string> = {}
    items.forEach((item) => { vals[item.key] = item.value })
    setEditValues(vals)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      for (const item of configs) {
        const newVal = editValues[item.key] ?? ''
        if (newVal !== item.value) {
          await authedRequest(`/configs?key=eq.${item.key}`, {
            method: 'PATCH',
            body: { value: newVal },
          })
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await loadConfigs()
    } catch {
      alert('保存失败')
    }
    setSaving(false)
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">系统配置</h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : saved ? '已保存 ✓' : '保存配置'}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--color-mute)]">暂无配置</div>
      ) : (
        <div className="space-y-6">
          {configs.map((item) => (
            <div
              key={item.key}
              className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-[var(--color-ink)] font-mono">{item.key}</span>
                  {item.description && (
                    <p className="text-xs text-[var(--color-mute)] mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>
              <textarea
                value={editValues[item.key] ?? ''}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
                rows={8}
                className="w-full px-4 py-2.5 text-sm font-mono bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                  text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                  focus:outline-none focus:border-[var(--color-link)] focus:ring-1 focus:ring-[var(--color-link-bg-soft)]
                  transition-colors resize-y"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
