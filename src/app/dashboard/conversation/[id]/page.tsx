import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ConversationView } from '@/components/conversation/ConversationView'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ChatLayout } from '@/components/dashboard/ChatLayout'
import type { Conversation } from '@/types'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch all conversations for the sidebar
  const conversations = await db.conversation.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1 // Get latest message for sidebar
      },
      chatraAccount: {
        select: { name: true, id: true }
      }
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50
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

  // Fetch the selected conversation with all messages
  const selectedConversation = await db.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      },
      chatraAccount: true
    }
  }) as unknown as Conversation

  if (!selectedConversation) {
    notFound()
  }

  const initialData = {
    conversations,
    stats
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <DashboardHeader user={session.user} />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar with conversations */}
          <div className="hidden lg:block lg:w-1/3 xl:w-1/4 bg-white border-r border-gray-200">
            <ChatLayout 
              initialData={initialData} 
              selectedConversationId={id}
            />
          </div>
          
          {/* Main conversation area */}
          <div className="flex-1 flex flex-col">
            {/* Mobile back button */}
            <div className="lg:hidden p-4 bg-white border-b border-gray-200">
              <ChatLayout 
                initialData={initialData} 
                selectedConversationId={id}
                selectedConversation={selectedConversation}
              />
            </div>
            
            {/* Conversation view */}
            <div className="flex-1 hidden lg:flex">
              <ConversationView 
                conversation={selectedConversation}
              />
            </div>
            
            {/* Mobile conversation view */}
            <div className="flex-1 lg:hidden">
              <ConversationView 
                conversation={selectedConversation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 