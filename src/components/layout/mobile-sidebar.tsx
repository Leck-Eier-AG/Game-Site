'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Gamepad2, Shield } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { UserMenu } from './user-menu'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface MobileSidebarProps {
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

export function MobileSidebar({ user }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  )

  const initials = user.displayName.charAt(0).toUpperCase()

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-4 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Menu className="h-6 w-6 text-white" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-zinc-900 border-white/10">
            <SheetHeader className="p-6 border-b border-white/10">
              <SheetTitle className="text-2xl font-bold text-white text-left">
                Kniff<span className="text-green-500">.</span>
              </SheetTitle>
            </SheetHeader>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
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

            {/* User Menu at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <UserMenu displayName={user.displayName} username={user.username} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Center branding */}
        <h1 className="text-xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">
          Kniff<span className="text-green-500">.</span>
        </h1>

        {/* Right avatar */}
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-green-600/20 text-green-500 text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Spacer for fixed top bar */}
      <div className="md:hidden h-16" />
    </>
  )
}
