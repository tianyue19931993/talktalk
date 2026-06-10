import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, BookOpen, User } from 'lucide-react'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/lessons', label: '题库', icon: BookOpen },
  { path: '/my', label: '我的', icon: User },
]

const activeColors = ['#7928ca', '#0070f3', '#ff0080']

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

      {/* Bottom navigation — glass morphism */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto safe-bottom z-50">
        <div className="bg-white/72 backdrop-blur-[20px] -webkit-backdrop-blur-[20px] border-t border-white/40 flex items-center justify-around h-16">
          {navItems.map((item, idx) => {
            const active = isActive(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className="flex flex-col items-center justify-center gap-0.5 px-5 py-1 transition-all duration-200"
              >
                <item.icon
                  className="w-5 h-5 transition-colors duration-200"
                  style={{ color: active ? activeColors[idx] : undefined }}
                />
                <span
                  className="text-[10px] font-medium transition-colors duration-200"
                  style={{ color: active ? activeColors[idx] : 'var(--color-mute)' }}
                >
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
