'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gamepad2, Shield } from 'lucide-react'
import { UserMenu } from './user-menu'
import { ConnectionStatus } from './connection-status'
import { BalanceWidget } from '@/components/wallet/balance-widget'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface SidebarProps {
  user: {
    displayName: string
    username: string
    role: UserRole
  }
}

const navItems = [
  {
    href: '/',
    label: 'Spielelobby',
    icon: Gamepad2,
    roles: ['ADMIN', 'USER'] as UserRole[],
  },
  {
    href: '/admin',
    label: 'Administration',
    icon: Shield,
    roles: ['ADMIN'] as UserRole[],
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  )

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 h-screen bg-zinc-900 border-r border-white/10 fixed left-0 top-0">
      {/* Branding */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white">
          Kniff<span className="text-green-500">.</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-green-500/10 text-green-500'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Balance Widget */}
      <div className="p-4 border-t border-white/10">
        <BalanceWidget />
      </div>

      {/* Connection Status */}
      <div className="p-4 border-t border-white/10">
        <ConnectionStatus />
      </div>

      {/* User Menu */}
      <div className="p-4">
        <UserMenu displayName={user.displayName} username={user.username} />
      </div>
    </aside>
  )
}
