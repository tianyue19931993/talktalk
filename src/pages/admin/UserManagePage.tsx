import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, Shield, User as UserIcon, Ban, CheckCircle, Crown } from 'lucide-react'
import { authedRequest } from '../../lib/supabase-auth'
import { useAuth } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'

interface UserRow {
  id: string
  email: string
  nickname: string
  role: string
  status: string
  createdAt: string
  subscriptionPlan: string | null
  subscriptionExpire: string | null
}

export default function UserManagePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isAdmin) { navigate('/admin/lessons'); return }
    loadUsers()
  }, [isAdmin])

  async function loadUsers() {
    setLoading(true)
    // 获取所有 profile + 有效订阅
    const { data: profiles, error } = await authedRequest<any[]>('/profiles?order=created_at.desc')
    if (error) { setLoading(false); return }

    const { data: subs } = await authedRequest<any[]>('/active_subscriptions')

    const subMap = new Map<string, any>()
    if (subs) {
      subs.forEach((s) => subMap.set(s.user_id, s))
    }

    setUsers(
      (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.email || '',
        nickname: p.nickname || '',
        role: p.role || 'user',
        status: p.status || 'active',
        createdAt: p.created_at,
        subscriptionPlan: subMap.get(p.id)?.plan_name || null,
        subscriptionExpire: subMap.get(p.id)?.expire_at || null,
      }))
    )
    setLoading(false)
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.nickname.toLowerCase().includes(search.toLowerCase()) ||
          u.id.includes(search)
      )
    : users

  const toggleStatus = async (user: UserRow) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active'
    await authedRequest(`/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    loadUsers()
  }

  const toggleRole = async (user: UserRow) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    await authedRequest(`/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      body: { role: newRole },
    })
    loadUsers()
  }

  if (loading) return <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">用户管理</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
          <input
            placeholder="搜索用户..."
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
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">用户</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">角色</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">状态</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">订阅</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm text-[var(--color-mute)]">暂无用户数据</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">{u.nickname?.[0] || u.email?.[0] || '?'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--color-ink)] font-medium truncate">{u.nickname || '未设置'}</p>
                        <p className="text-xs text-[var(--color-mute)] truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-[var(--color-canvas-soft-2)] text-[var(--color-body)]'
                    }`}>
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                      {u.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {u.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.subscriptionPlan ? (
                      <div>
                        <span className="flex items-center gap-1 text-xs text-[var(--color-link)]">
                          <Crown className="w-3 h-3" />
                          {u.subscriptionPlan}
                        </span>
                        {u.subscriptionExpire && (
                          <p className="text-[10px] text-[var(--color-mute)] mt-0.5">
                            到期 {new Date(u.subscriptionExpire).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-mute)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleRole(u)}
                        className="p-1.5 rounded text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                        title={u.role === 'admin' ? '取消管理员' : '设为管理员'}
                      >
                        {u.role === 'admin' ? <UserIcon className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => toggleStatus(u)}
                        className="p-1.5 rounded text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title={u.status === 'active' ? '禁用' : '启用'}
                      >
                        {u.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                      </button>
                    </div>
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
