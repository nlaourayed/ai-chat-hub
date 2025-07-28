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
    
    const expectedWithPrefix = `sha256=${expectedSignature}`
    
    // Debug logging
    console.log('🔐 [SIGNATURE] Verification details:')
    console.log('  - Received signature:', signature)
    console.log('  - Expected (raw hex):', expectedSignature)
    console.log('  - Expected (with prefix):', expectedWithPrefix)
    console.log('  - Raw match:', signature === expectedSignature)
    console.log('  - Prefix match:', signature === expectedWithPrefix)
    
    return signature === expectedSignature || signature === expectedWithPrefix
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
    console.log('🔄 [CHATRA] Sending message to conversation:', conversationId)
    
    // Get Chatra account details
    const chatraAccount = await db.chatraAccount.findUnique({
      where: { id: chatraAccountId }
    })

    if (!chatraAccount) {
      throw new Error('Chatra account not found')
    }

    console.log('🔑 [CHATRA] Using account:', chatraAccount.name, chatraAccount.chatraId)

    // Prepare the correct request body format for Chatra API
    const requestBody = {
      clientId: conversationId, // Use the Chatra conversation ID as clientId
      text: message.text,
      agentId: undefined as string | undefined, // Will be set if we have it
      agentEmail: undefined as string | undefined,
      agentName: message.sender_name || 'AI Assistant'
    }

    // If we have specific agent info, use agentId, otherwise use agentEmail/agentName
    if (chatraAccount.agentId) {
      requestBody.agentId = chatraAccount.agentId
    } else {
      requestBody.agentEmail = chatraAccount.agentEmail || 'ai@assistant.com'
      requestBody.agentName = message.sender_name || 'AI Assistant'
    }

    // Use correct Chatra API authentication format
    const authHeader = `Chatra.Simple ${chatraAccount.publicApiKey}:${chatraAccount.apiKey}`

    console.log('📡 [CHATRA] Making API request with auth format: Chatra.Simple...')

    const response = await fetch(`https://app.chatra.io/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📡 [CHATRA] API Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [CHATRA] API error: ${response.status} ${response.statusText}`)
      console.error('❌ [CHATRA] Error details:', errorText)
      
      // Try alternative authentication method if the first one fails
      if (response.status === 401) {
        console.log('🔄 [CHATRA] Trying Basic auth as fallback...')
        
        const basicAuth = Buffer.from(`${chatraAccount.apiKey}:`).toString('base64')
        const retryResponse = await fetch(`https://app.chatra.io/api/v1/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text()
          console.error(`❌ [CHATRA] Basic auth also failed: ${retryResponse.status}`)
          console.error('❌ [CHATRA] Retry error details:', retryErrorText)
          throw new Error(`Chatra API error: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`)
        }

        const retryResult = await retryResponse.json()
        console.log('✅ [CHATRA] Message sent successfully with Basic auth:', retryResult)
        return true
      }
      
      throw new Error(`Chatra API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ [CHATRA] Message sent successfully with Chatra.Simple auth:', result)
    return true
  } catch (error) {
    console.error('❌ [CHATRA] Error sending message:', error)
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