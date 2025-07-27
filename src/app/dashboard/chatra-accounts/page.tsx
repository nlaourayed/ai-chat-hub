import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ChatraAccountManager } from '@/components/chatra/ChatraAccountManager'

export default async function ChatraAccountsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch Chatra accounts
  const chatraAccounts = await db.chatraAccount.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          conversations: true
        }
      }
    }
  })

  // Get stats
  const stats = {
    totalAccounts: chatraAccounts.length,
    activeAccounts: chatraAccounts.filter(acc => acc.isActive).length,
    totalConversations: chatraAccounts.reduce((sum, acc) => sum + acc._count.conversations, 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chatra Account Management
          </h1>
          <p className="text-gray-600">
            Manage your Chatra accounts, API keys, and webhook configurations
          </p>
        </div>

        <ChatraAccountManager 
          accounts={chatraAccounts}
          stats={stats}
          currentDomain={process.env.NEXTAUTH_URL || 'https://your-app.vercel.app'}
        />
      </main>
    </div>
  )
} 