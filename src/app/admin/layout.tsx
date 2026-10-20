'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Scale, LayoutDashboard, HelpCircle, Users, Settings, LogOut, Gavel } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/questions', icon: HelpCircle, label: 'Questions' },
  { href: '/admin/participants', icon: Users, label: 'Participants' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Don't apply admin layout to the login page
  if (pathname === '/admin') return <>{children}</>

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-yellow-900/20 bg-[#0d0b14] flex flex-col fixed h-screen hidden md:flex">
        {/* Logo */}
        <div className="p-5 border-b border-yellow-900/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500/15 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Ideas on Trial</p>
              <p className="text-yellow-600 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-yellow-900/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0b14] border-b border-yellow-900/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold text-sm">Admin Panel</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-400">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0b14] border-t border-yellow-900/20 flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${active ? 'text-yellow-400' : 'text-gray-500'}`}>
              <Icon className="w-5 h-5 mb-0.5" />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-14 md:mt-0 mb-16 md:mb-0">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
