import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Fetch conversations with related data (same logic as dashboard page)
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

    return NextResponse.json({
      conversations,
      stats
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 