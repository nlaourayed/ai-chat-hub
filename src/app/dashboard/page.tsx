import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ConversationList } from '@/components/dashboard/ConversationList'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatsCards } from '@/components/dashboard/StatsCards'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch conversations with related data
  const conversations = await db.conversation.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1 // Get latest message
      },
      chatraAccount: {
        select: { name: true, id: true }
      }
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50 // Limit to recent conversations
  })

  // Calculate stats
  const stats = {
    totalConversations: conversations.length,
    activeConversations: conversations.filter((c: { status: string }) => c.status === 'active').length,
    pendingResponses: await db.message.count({
      where: {
        senderType: 'llm',
        isApproved: null
      }
    }),
    totalAccounts: await db.chatraAccount.count({
      where: { isActive: true }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your conversations across all Chatra accounts
          </p>
        </div>

        <StatsCards stats={stats} />
        
        <div className="mt-8">
          <ConversationList conversations={conversations} />
        </div>
      </main>
    </div>
  )
} 