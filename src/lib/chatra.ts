import { db } from './db'
import crypto from 'crypto'

// Types for Chatra webhook payloads
// Based on https://chatra.com/help/api/#webhooks
export interface ChatraWebhookPayload {
  event: 'chatStarted' | 'chatFragment' | 'chatTranscript'
  data: {
    // Chat data structure based on Chatra webhook documentation
    id?: string
    client?: {
      id?: string
      name?: string
      displayedName?: string
      email?: string
      info?: {
        name?: string
        email?: string
        phone?: string
      }
    }
    messages?: Array<{
      id: string
      type: 'client' | 'agent'
      text?: string
      createdAt: number
      agentId?: string
      agentName?: string
    }>
    agents?: Array<{
      id: string
      name: string
      email?: string
    }>
    hostName?: string
    chatStartedPage?: {
      link: string
      title: string
    }
    account?: {
      id: string
    }
  }
}

export interface ChatraApiMessage {
  text: string
  sender_type: 'agent'
  sender_name?: string
}

/**
 * Verify Chatra webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Implementation would depend on Chatra's specific signature verification method
    // This is a placeholder - check Chatra's documentation for exact implementation

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

/**
 * Process incoming Chatra webhook
 * Based on https://chatra.com/help/api/#webhooks
 */
export async function processWebhook(payload: ChatraWebhookPayload): Promise<void> {
  try {
    const { event, data } = payload

    // Find the Chatra account
    const chatraAccount = await db.chatraAccount.findUnique({
      where: { chatraId: data.account?.id || '' }
    })

    if (!chatraAccount) {
      console.error('Unknown Chatra account:', data.account?.id)
      return
    }

    switch (event) {
      case 'chatStarted':
        await handleChatStarted(data, chatraAccount.id)
        break
      
      case 'chatFragment':
        await handleChatFragment(data, chatraAccount.id)
        break
      
      case 'chatTranscript':
        await handleChatTranscript(data, chatraAccount.id)
        break
      
      default:
        console.log('Unhandled webhook event:', event)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    throw error
  }
}

/**
 * Handle chatStarted webhook event
 * Based on https://chatra.com/help/api/#webhooks
 */
async function handleChatStarted(data: ChatraWebhookPayload['data'], chatraAccountId: string): Promise<void> {
  if (!data.id) return

  const conversationData = {
    chatraConversationId: data.id,
    chatraAccountId,
    clientName: data.client?.name || data.client?.displayedName || null,
    clientEmail: data.client?.info?.email || data.client?.email || null,
    status: 'active',
    updatedAt: new Date(),
    createdAt: new Date()
  }

  // Create new conversation
  await db.conversation.upsert({
    where: { chatraConversationId: data.id },
    update: conversationData,
    create: conversationData
  })

  console.log('✅ Chat started for conversation:', data.id)
}

/**
 * Handle chatFragment webhook event (contains messages)
 * Based on https://chatra.com/help/api/#webhooks
 */
async function handleChatFragment(data: ChatraWebhookPayload['data'], chatraAccountId: string): Promise<void> {
  if (!data.id || !data.messages) return

  // Ensure conversation exists
  let conversation = await db.conversation.findUnique({
    where: { chatraConversationId: data.id }
  })

  if (!conversation) {
    // Create conversation if it doesn't exist
    conversation = await db.conversation.create({
      data: {
        chatraConversationId: data.id,
        chatraAccountId,
        clientName: data.client?.name || data.client?.displayedName || null,
        clientEmail: data.client?.info?.email || data.client?.email || null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  // Process messages in the fragment
  for (const message of data.messages) {
    const messageData = {
      conversationId: conversation.id,
      chatraMessageId: message.id,
      content: message.text || '',
      senderType: message.type,
      senderName: message.agentName || data.client?.name || data.client?.displayedName || null,
      messageType: 'text',
      createdAt: new Date(message.createdAt),
      updatedAt: new Date()
    }

    // Check if message already exists
    const existingMessage = await db.message.findFirst({
      where: { chatraMessageId: message.id }
    })

    if (!existingMessage) {
      await db.message.create({ data: messageData })
    }
  }

  // Update conversation's last message timestamp
  const lastMessage = data.messages[data.messages.length - 1]
  if (lastMessage) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { 
        lastMessageAt: new Date(lastMessage.createdAt),
        updatedAt: new Date()
      }
    })
  }

  console.log('✅ Chat fragment processed for conversation:', data.id, 'with', data.messages.length, 'messages')
}

/**
 * Handle chatTranscript webhook event (completed chat)
 * Based on https://chatra.com/help/api/#webhooks
 */
async function handleChatTranscript(data: ChatraWebhookPayload['data'], chatraAccountId: string): Promise<void> {
  if (!data.id) return

  // Update conversation status to resolved
  await db.conversation.updateMany({
    where: { 
      chatraConversationId: data.id,
      chatraAccountId 
    },
    data: { 
      status: 'resolved',
      updatedAt: new Date()
    }
  })

  console.log('✅ Chat transcript received for conversation:', data.id, '- marked as resolved')
}

/**
 * Send message to Chatra via correct Messages API endpoint
 * Based on https://chatra.com/help/api/#rest
 */
export async function sendMessageToChatra(
  chatraAccountId: string,
  conversationId: string,
  message: ChatraApiMessage
): Promise<boolean> {
  try {
    // Get Chatra account details
    const chatraAccount = await db.chatraAccount.findUnique({
      where: { id: chatraAccountId }
    })

    if (!chatraAccount) {
      throw new Error('Chatra account not found')
    }

    // Use correct Messages API endpoint with Basic Auth
    const auth = Buffer.from(`${chatraAccount.apiKey}:${chatraAccount.webhookSecret}`).toString('base64')
    
    const response = await fetch(`https://app.chatra.io/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...message,
        conversation_id: conversationId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Chatra Messages API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Chatra API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Message sent successfully to Chatra:', result)
    return true
  } catch (error) {
    console.error('Error sending message to Chatra:', error)
    return false
  }
}

/**
 * Get conversation details from local database
 * Note: Chatra API doesn't have a direct conversations endpoint
 * Based on https://chatra.com/help/api/#rest - only messages, pushedMessages, clients available
 */
export async function getConversationFromChatra(
  chatraAccountId: string,
  conversationId: string
): Promise<Record<string, unknown>> {
  try {
    // Since Chatra API doesn't have conversations endpoint, get from local DB
    const conversation = await db.conversation.findUnique({
      where: { chatraConversationId: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Limit to recent messages
        },
        chatraAccount: true
      }
    })

    if (!conversation) {
      throw new Error('Conversation not found in local database')
    }

    // Return conversation data in Chatra-like format
    return {
      id: conversation.chatraConversationId,
      status: conversation.status,
      client: {
        name: conversation.clientName,
        email: conversation.clientEmail
      },
      messages: conversation.messages.map(msg => ({
        id: msg.chatraMessageId,
        text: msg.content,
        type: msg.senderType,
        sender_name: msg.senderName,
        created_at: msg.createdAt.toISOString()
      })),
      created_at: conversation.createdAt.toISOString(),
      updated_at: conversation.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Error fetching conversation:', error)
    throw error
  }
}

/**
 * Utility function to create a Chatra account
 */
export async function createChatraAccount(data: {
  name: string
  chatraId: string
  apiKey: string
  webhookSecret: string
}): Promise<string> {
  const account = await db.chatraAccount.create({
    data: {
      name: data.name,
      chatraId: data.chatraId,
      apiKey: data.apiKey,
      webhookSecret: data.webhookSecret,
      isActive: true
    }
  })

  return account.id
} 