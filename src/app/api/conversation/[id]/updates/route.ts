import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: PageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Verify conversation exists and user has access
  const conversation = await db.conversation.findUnique({
    where: { id },
    select: { id: true, updatedAt: true }
  })

  if (!conversation) {
    return new NextResponse('Conversation not found', { status: 404 })
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`))
      
      let lastChecked = conversation.updatedAt
      
      const checkForUpdates = async () => {
        try {
          const updatedConversation = await db.conversation.findUnique({
            where: { id },
            select: { 
              id: true, 
              updatedAt: true,
              lastMessageAt: true,
              messages: {
                where: {
                  createdAt: {
                    gt: lastChecked
                  }
                },
                orderBy: { createdAt: 'asc' },
                select: {
                  id: true,
                  content: true,
                  senderType: true,
                  senderName: true,
                  createdAt: true,
                  isApproved: true
                }
              }
            }
          })

          if (updatedConversation && updatedConversation.messages.length > 0) {
            // Send update notification
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'messages',
              messages: updatedConversation.messages,
              timestamp: new Date().toISOString()
            })}\n\n`))
            
            lastChecked = updatedConversation.updatedAt
          }
        } catch (error) {
          console.error('Error checking for updates:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error', 
            message: 'Failed to check for updates',
            timestamp: new Date().toISOString()
          })}\n\n`))
        }
      }

      // Check for updates every 2 seconds
      const interval = setInterval(checkForUpdates, 2000)
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`))
      }, 30000)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clearInterval(heartbeat)
        controller.close()
      })
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
} 