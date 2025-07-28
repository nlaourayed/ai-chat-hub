import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ChatLayout } from '@/components/dashboard/ChatLayout'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch initial data (same logic as before)
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

  const initialData = {
    conversations: conversations as any, // Type cast to avoid complex type issues for now
    stats
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <DashboardHeader user={session.user} />
      <div className="flex-1 overflow-hidden">
        <ChatLayout initialData={initialData} />
      </div>
    </div>
  )
} 