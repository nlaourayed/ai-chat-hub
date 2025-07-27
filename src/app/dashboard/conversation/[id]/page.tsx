import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ConversationView } from '@/components/conversation/ConversationView'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
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

  // Fetch conversation with messages
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      },
      chatraAccount: true
    }
  }) as unknown as Conversation // Prisma doesn't generate literal types for string fields

  if (!conversation) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      
      <main className="container mx-auto px-4 py-8">
        <ConversationView 
          conversation={conversation}
          user={session.user}
        />
      </main>
    </div>
  )
} 