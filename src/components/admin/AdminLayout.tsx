import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { FileText, Tags, BookType, ChevronLeft } from 'lucide-react'

const sidebarItems = [
  { path: '/admin/lessons', label: '题目管理', icon: FileText },
  { path: '/admin/types', label: '题型管理', icon: BookType },
  { path: '/admin/tags', label: '标签管理', icon: Tags },
]

export default function AdminLayout() {
  const location = useLocation()

  // Hide sidebar on edit page (full-width form)
  const isEditPage = location.pathname.includes('/admin/lesson/edit') || location.pathname.includes('/admin/lesson/new')

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
                  <span className="text-lg font-semibold tracking-tight">TalkTalk</span>
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

        {/* Mobile bottom tab bar for admin */}
        {!isEditPage && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 safe-bottom z-50">
            <div className="bg-white/72 backdrop-blur-[20px] -webkit-backdrop-blur-[20px] border-t border-white/40 flex items-center justify-around h-14">
              {sidebarItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 px-3 py-1 ${
                      isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-mute)]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-[10px]">{item.label}</span>
                </NavLink>
              ))}
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
