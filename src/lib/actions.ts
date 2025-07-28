'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { db } from './db'
import { sendMessageToChatra } from './chatra'

/**
 * Update message content (for editing LLM responses before approval)
 */
export async function updateMessageContent(messageId: string, newContent: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const message = await db.message.update({
      where: { id: messageId },
      data: { 
        content: newContent.trim(),
        updatedAt: new Date()
      }
    })

    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/conversation/${message.conversationId}`)
    
    return { success: true, message }
  } catch (error) {
    console.error('Error updating message content:', error)
    throw error
  }
}

/**
 * Approve an LLM-generated response and optionally extract as knowledge
 */
export async function approveMessage(messageId: string, extractToKnowledge: boolean = true) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    // Update message approval status
    const message = await db.message.update({
      where: { id: messageId },
      data: { 
        isApproved: true,
        updatedAt: new Date()
      },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10
            },
            chatraAccount: true
          }
        }
      }
    })

    // Send the approved message to Chatra
    if (message.senderType === 'llm' && message.conversation.chatraAccount) {
      const { sendMessageToChatra } = await import('./chatra')
      
      const success = await sendMessageToChatra(
        message.conversation.chatraAccount.id,
        message.conversation.chatraConversationId,
        {
          text: message.content,
          sender_type: 'agent',
          sender_name: session.user.name || 'AI Assistant'
        }
      )

      if (!success) {
        console.error('Failed to send approved message to Chatra')
        // Note: We don't throw here because the message is still approved in our system
      } else {
        console.log('✅ Approved message sent to Chatra successfully')
      }
    }

    // Extract to knowledge base if it's an approved agent response to a client question
    if (extractToKnowledge && message.senderType === 'llm') {
      // Find the preceding client message
      const clientMessage = message.conversation.messages
        .reverse()
        .find(msg => 
          msg.senderType === 'client' && 
          msg.createdAt < message.createdAt
        )

      if (clientMessage) {
        const { generateEmbedding } = await import('./llm')
        const qaPair = `Q: ${clientMessage.content}\nA: ${message.content}`
        
        // Check if this Q&A pair already exists
        const existing = await db.knowledgeBase.findFirst({
          where: {
            content: qaPair,
            sourceId: message.conversationId
          }
        })

        if (!existing) {
          const embedding = await generateEmbedding(qaPair)
          
          await db.knowledgeBase.create({
            data: {
              content: qaPair,
              source: 'approved_response',
              sourceId: message.conversationId,
              metadata: {
                conversationId: message.conversationId,
                clientMessageId: clientMessage.id,
                approvedMessageId: message.id,
                clientName: message.conversation.clientName,
                clientEmail: message.conversation.clientEmail,
                approvedAt: new Date().toISOString()
              },
              embedding: `[${embedding.join(',')}]`
            }
          })
          
          console.log('✅ Auto-extracted approved Q&A to knowledge base')
        }
      }
    }

    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/conversation/${message.conversationId}`)
    
    return { success: true, message }
  } catch (error) {
    console.error('Error approving message:', error)
    throw error
  }
}

/**
 * Reject an LLM-generated response
 */
export async function rejectMessage(messageId: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const message = await db.message.update({
      where: { id: messageId },
      data: { 
        isApproved: false,
        updatedAt: new Date()
      }
    })

    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/conversation/${message.conversationId}`)
    
    return { success: true, message }
  } catch (error) {
    console.error('Error rejecting message:', error)
    throw error
  }
}

/**
 * Send a manual message from an agent
 */
export async function sendAgentMessage(conversationId: string, content: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        chatraAccount: true
      }
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Send message to Chatra
    const success = await sendMessageToChatra(
      conversation.chatraAccount.id,
      conversation.chatraConversationId,
      {
        text: content,
        sender_type: 'agent',
        sender_name: session.user.name || session.user.email
      }
    )

    if (success) {
      // Create message record
      await db.message.create({
        data: {
          conversationId,
          content,
          senderType: 'agent',
          senderName: session.user.name || session.user.email,
          messageType: 'text',
          isApproved: true
        }
      })

      // Update conversation timestamp
      await db.conversation.update({
        where: { id: conversationId },
        data: { 
          lastMessageAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    revalidatePath(`/dashboard/conversation/${conversationId}`)
    return { success }
  } catch (error) {
    console.error('Error sending agent message:', error)
    throw error
  }
}

/**
 * Create a new Chatra account configuration
 */
export async function createChatraAccountAction(data: {
  name: string
  chatraId: string
  apiKey: string
  webhookSecret: string
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  try {
    const account = await db.chatraAccount.create({
      data: {
        name: data.name,
        chatraId: data.chatraId,
        apiKey: data.apiKey,
        webhookSecret: data.webhookSecret,
        isActive: true
      }
    })

    revalidatePath('/dashboard')
    return { success: true, accountId: account.id }
  } catch (error) {
    console.error('Error creating Chatra account:', error)
    throw error
  }
}

/**
 * Create a demo user (for development/setup)
 */
export async function createDemoUser(email: string, password: string, name?: string) {
  const bcrypt = await import('bcryptjs')
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Demo User',
        role: 'admin'
      }
    })

    return { success: true, userId: user.id }
  } catch (error) {
    console.error('Error creating demo user:', error)
    throw error
  }
} 