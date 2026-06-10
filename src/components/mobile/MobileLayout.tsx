import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, BookOpen, User } from 'lucide-react'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/lessons', label: '题库', icon: BookOpen },
  { path: '/my', label: '我的', icon: User },
]

export default function MobileLayout() {
  const location = useLocation()
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas-soft)] max-w-lg mx-auto">
      {/* Main content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[var(--color-canvas)] border-t border-[var(--color-hairline)] safe-bottom z-50">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1 transition-colors ${
                isActive(item.path)
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-mute)]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
