'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface DashboardHeaderProps {
  user: {
    id: string
    email: string
    name?: string
    role: string
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                AI Chat Hub
              </h1>
            </Link>
            
            <nav className="flex space-x-6">
              <Link 
                href="/dashboard" 
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                Conversations
              </Link>
              <Link 
                href="/dashboard/knowledge-base" 
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === '/dashboard/knowledge-base' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                Knowledge Base
              </Link>
              <Link 
                href="/dashboard/chatra-accounts" 
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === '/dashboard/chatra-accounts' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                Chatra Accounts
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome, {user.name || user.email}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
} 