import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Plus, Pencil, Trash2, Check, X, DollarSign, Calendar } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authedRequest } from '../../lib/supabase-auth'
import { useAuth } from '../../stores/authStore'
import type { Plan } from '../../types/auth'

function rowToPlan(row: any): Plan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    price: Number(row.price),
    description: row.description || '',
    permissions: row.permissions || [],
    status: row.status,
    sort: row.sort || 0,
    durationDays: row.duration_days || 30,
    createdAt: row.created_at,
  }
}

// 可用权限列表
const PERMISSION_OPTIONS = [
  { key: 'view_demo', label: '查看互动演示' },
  { key: 'create_demo', label: '创建互动演示' },
]

export default function PlanManagePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  // 新建
  const [showNew, setShowNew] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDuration, setNewDuration] = useState('30')
  const [newPermissions, setNewPermissions] = useState<string[]>([])

  // 编辑
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDuration, setEditDuration] = useState('30')
  const [editPermissions, setEditPermissions] = useState<string[]>([])

  useEffect(() => {
    if (!isAdmin) { navigate('/admin/lessons'); return }
    loadPlans()
  }, [isAdmin])

  async function loadPlans() {
    setLoading(true)
    const { data } = await authedRequest<any[]>('/plans?order=sort.asc')
    if (data) setPlans(data.map(rowToPlan))
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newCode.trim() || !newName.trim() || !newPrice.trim()) return
    await authedRequest('/plans', {
      method: 'POST',
      body: {
        code: newCode.trim(),
        name: newName.trim(),
        price: Number(newPrice),
        description: newDesc.trim(),
        duration_days: Number(newDuration) || 30,
        permissions: newPermissions,
        sort: plans.length + 1,
      },
    })
    setShowNew(false)
    setNewCode(''); setNewName(''); setNewPrice(''); setNewDesc(''); setNewDuration('30'); setNewPermissions([])
    loadPlans()
  }

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id)
    setEditName(plan.name)
    setEditPrice(String(plan.price))
    setEditDesc(plan.description)
    setEditDuration(String(plan.durationDays))
    setEditPermissions(plan.permissions || [])
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim() || !editPrice.trim()) return
    await authedRequest(`/plans?id=eq.${editingId}`, {
      method: 'PATCH',
      body: {
        name: editName.trim(),
        price: Number(editPrice),
        description: editDesc.trim(),
        duration_days: Number(editDuration) || 30,
        permissions: editPermissions,
      },
    })
    setEditingId(null)
    loadPlans()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此套餐？')) return
    await authedRequest(`/plans?id=eq.${id}`, { method: 'DELETE' })
    loadPlans()
  }

  if (loading) return <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">套餐管理</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" />
          新增套餐
        </Button>
      </div>

      {/* New form */}
      {showNew && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
            <Input placeholder="套餐编码 (basic)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            <Input placeholder="套餐名称" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="价格" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" />
            <Input placeholder="有效期(天)" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} type="number" />
            <Input placeholder="描述（可选）" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          {/* 权限勾选 */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-[var(--color-mute)] shrink-0">权限：</span>
            {PERMISSION_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-1.5 text-sm text-[var(--color-body)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPermissions.includes(opt.key)}
                  onChange={(e) => {
                    setNewPermissions(
                      e.target.checked
                        ? [...newPermissions, opt.key]
                        : newPermissions.filter((p) => p !== opt.key)
                    )
                  }}
                  className="accent-[var(--color-link)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowNew(false)}>取消</Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>创建</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">编码</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">名称</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">价格</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">有效期</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm text-[var(--color-mute)]">暂无套餐数据</td></tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-[var(--color-mute)]">{plan.code}</td>
                  <td className="px-4 py-3">
                    {editingId === plan.id ? (
                      <div className="space-y-1">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1 text-sm border border-[var(--color-hairline)] rounded-[var(--radius-sm)]" autoFocus />
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="描述" className="w-full px-2 py-1 text-xs border border-[var(--color-hairline)] rounded-[var(--radius-sm)]" />
                        <div className="flex items-center gap-3 pt-1">
                          {PERMISSION_OPTIONS.map((opt) => (
                            <label key={opt.key} className="flex items-center gap-1 text-xs text-[var(--color-body)] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editPermissions.includes(opt.key)}
                                onChange={(e) => {
                                  setEditPermissions(
                                    e.target.checked
                                      ? [...editPermissions, opt.key]
                                      : editPermissions.filter((p) => p !== opt.key)
                                  )
                                }}
                                className="accent-[var(--color-link)]"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm text-[var(--color-ink)] font-medium">{plan.name}</span>
                        {plan.description && <p className="text-xs text-[var(--color-mute)] mt-0.5">{plan.description}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === plan.id ? (
                      <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" className="w-20 px-2 py-1 text-sm border border-[var(--color-hairline)] rounded-[var(--radius-sm)]" />
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-[var(--color-ink)]">
                        <DollarSign className="w-3.5 h-3.5 text-[var(--color-mute)]" />
                        {plan.price}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === plan.id ? (
                      <input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} type="number" className="w-20 px-2 py-1 text-sm border border-[var(--color-hairline)] rounded-[var(--radius-sm)]" />
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-[var(--color-ink)]">
                        <Calendar className="w-3.5 h-3.5 text-[var(--color-mute)]" />
                        {plan.durationDays} 天
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === plan.id ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={handleUpdate} className="p-1.5 rounded text-green-600 hover:bg-green-50 cursor-pointer"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded text-[var(--color-body)] hover:bg-[var(--color-canvas-soft-2)] cursor-pointer"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(plan)} className="p-1.5 rounded text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(plan.id)} className="p-1.5 rounded text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
