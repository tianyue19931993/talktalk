import { useEffect } from 'react'
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom'
import { FileText, Tags, BookType, Users, Crown, Receipt, ChevronLeft, MoreHorizontal, Settings } from 'lucide-react'
import { useAuth } from '../../stores/authStore'

interface SidebarItem {
  path: string
  label: string
  icon: any
  end?: boolean
}

const sidebarItems: SidebarItem[] = [
  { path: '/admin/lessons', label: '题目管理', icon: FileText },
  { path: '/admin/types', label: '题型管理', icon: BookType },
  { path: '/admin/tags', label: '标签管理', icon: Tags },
  { path: '/admin/user-questions', label: '用户题目管理', icon: FileText },
  { path: '/admin/users', label: '用户管理', icon: Users },
  { path: '/admin/subscriptions', label: '订阅管理', icon: Crown },
  { path: '/admin/orders', label: '订单管理', icon: Receipt },
  { path: '/admin/plans', label: '套餐管理', icon: Crown },
  { path: '/admin/configs', label: '系统配置', icon: Settings },
  // { path: '/admin/component-preview', label: '组件预览', icon: Eye },
]

// 移动端只显示前 5 个核心菜单，其余折叠到

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, isLoading, isLoggedIn } = useAuth()

  // Admin 权限守卫：未登录去登录页，非 admin 回首页
  useEffect(() => {
    if (isLoading) return
    if (!isAdmin) {
      const target = isLoggedIn ? '/' : '/login?redirect=/admin'
      navigate(target, { replace: true })
    }
  }, [isLoading, isAdmin, isLoggedIn, navigate])

  const isEditPage = location.pathname.includes('/admin/lesson/edit') || location.pathname.includes('/admin/lesson/new')

  // 加载中或非 admin → 不渲染内容（等待重定向）
  if (isLoading || !isAdmin) {
    return <div className="min-h-screen bg-[var(--color-canvas-soft)]" />
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas-soft)]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {isEditPage ? (
              <Link to="/admin/lessons" className="flex items-center gap-2 text-sm text-[var(--color-body)] hover:text-[var(--color-ink)] transition-colors">
                <ChevronLeft className="w-4 h-4" />
                返回题目管理
              </Link>
            ) : (
              <>
                <Link to="/" className="flex items-center gap-2">
                  <span className="text-lg font-semibold tracking-tight">成长表达实验室 M</span>
                </Link>
                <span className="text-xs text-[var(--color-mute)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-full">管理后台</span>
              </>
            )}
          </div>
          <Link
            to="/"
            className="text-xs text-[var(--color-body)] hover:text-[var(--color-ink)] transition-colors"
          >
            返回前台 →
          </Link>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar - hide on edit pages */}
        {!isEditPage && (
          <aside className="hidden md:block w-56 shrink-0 border-r border-[var(--color-hairline)] min-h-[calc(100vh-3.5rem)] bg-[var(--color-canvas)]">
            <nav className="p-3 space-y-1">
              {sidebarItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-[var(--radius-md)] transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--color-link-bg-soft)] text-[var(--color-link)] font-medium'
                        : 'text-[var(--color-body)] hover:bg-[var(--color-canvas-soft)] hover:text-[var(--color-ink)]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* Mobile bottom tab bar — 最多 5 项，超出的折叠到「更多」 */}
        {!isEditPage && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 safe-bottom z-50">
            <div className="bg-white/72 backdrop-blur-[20px] -webkit-backdrop-blur-[20px] border-t border-white/40 flex items-center justify-around h-14 overflow-x-auto">
              {sidebarItems.slice(0, 5).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 px-2.5 py-1 ${
                      isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-mute)]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-[10px] whitespace-nowrap">{item.label}</span>
                </NavLink>
              ))}
              {/* 折叠更多 — 直接显示为当前页 */}
              <NavLink
                to={sidebarItems[5].path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2.5 py-1 ${
                    isActive || sidebarItems.slice(5).some((s) => location.pathname.startsWith(s.path))
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-mute)]'
                  }`
                }
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-[10px] whitespace-nowrap">更多</span>
              </NavLink>
            </div>
          </nav>
        )}

        {/* Content */}
        <main className={`flex-1 ${isEditPage ? 'p-0' : 'p-4 md:p-6 pb-20 md:pb-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
