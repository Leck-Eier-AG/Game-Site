'use client'

import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/lib/actions/auth'

interface UserMenuProps {
  displayName: string
  username: string
}

export function UserMenu({ displayName, username }: UserMenuProps) {
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-colors text-left">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-green-600/20 text-green-500 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-white truncate">
              {displayName}
            </span>
            <span className="text-xs text-gray-400 truncate">@{username}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={async () => {
            await logout()
          }}
          className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
