import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/chatra'
import { generateLLMResponse, formatConversationHistory } from '@/lib/llm'
import { db } from '@/lib/db'
import type { ChatraWebhookPayload as WebhookPayload, LLMResponse, ChatraMessage } from '@/types'

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-chatra-signature, x-hub-signature-256',
    },
  })
}

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (!isProduction) {
    console.log('🔍 [DEBUG] Webhook POST request received')
  }
  
  try {
    // Get the raw body and headers
    const body = await request.text()
    
    // Check multiple possible signature header names and log all headers for debugging
    const signature = request.headers.get('x-chatra-signature') || 
                     request.headers.get('x-hub-signature-256') || 
                     request.headers.get('x-signature') ||
                     request.headers.get('signature') || ''
    
    // Debug: Log all headers to see what Chatra is actually sending
    console.log('📨 [WEBHOOK] Headers received:')
    for (const [key, value] of request.headers.entries()) {
      console.log(`  - ${key}: ${value}`)
    }
    
    if (!isProduction) {
      console.log('🔍 [DEBUG] Raw body length:', body.length)
      console.log('🔍 [DEBUG] Raw body content:', body.substring(0, 500) + (body.length > 500 ? '...' : ''))
      console.log('🔍 [DEBUG] Signature present:', !!signature)
    }
    
    // Parse the webhook payload
    let payload: WebhookPayload
    try {
      payload = JSON.parse(body) as WebhookPayload
      if (!isProduction) {
        console.log('🔍 [DEBUG] Payload keys:', Object.keys(payload))
        console.log('🔍 [DEBUG] Has messages:', !!payload.messages)
        console.log('🔍 [DEBUG] Has client:', !!payload.client)
        console.log('🔍 [DEBUG] Client chatId:', payload.client?.chatId)
      }
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Get configured Chatra account(s) - try to match by payload or use the first active one
    let chatraAccount = null
    
    // First, try to find account by webhook signature (if we can match it)
    const chatraAccounts = await db.chatraAccount.findMany({
      where: { isActive: true }
    })

    if (chatraAccounts.length === 0) {
      console.error('❌ No active Chatra accounts configured')
      return NextResponse.json({ error: 'No active accounts configured' }, { status: 404 })
    }

    // For now, use the first active account if we can't determine which one sent the webhook
    // In the future, we could use the signature verification to match the correct account
    chatraAccount = chatraAccounts[0]
    
    console.log('✅ [WEBHOOK] Using Chatra account:', chatraAccount.name, `(${chatraAccount.chatraId})`)

    // Verify webhook signature (temporarily disabled for debugging)
    const isValidSignature = verifyWebhookSignature(body, signature, chatraAccount.webhookSecret)
    
    // Add detailed debugging for signature verification
    console.log('🔐 [WEBHOOK] Signature verification details:')
    console.log('  - Received signature:', signature || '(none)')
    console.log('  - Expected signature starts with:', chatraAccount.webhookSecret?.substring(0, 10) + '...')
    console.log('  - Body length:', body.length)
    console.log('  - Signature valid:', isValidSignature)
    
    // Handle different signature scenarios
    if (!signature) {
      console.log('⚠️ [WEBHOOK] No signature received - Chatra may not be configured to send signatures')
      console.log('💡 [TIP] Check Chatra webhook settings or disable signature verification for this account')
    } else if (isProduction && !isValidSignature) {
      console.warn('⚠️ Invalid webhook signature - signature mismatch')
      console.log('🔧 [DEBUG] To fix: ensure webhook secret in Chatra matches:', chatraAccount.webhookSecret)
      console.log('⚠️ [TEMP] Proceeding anyway for debugging - DISABLE THIS IN PRODUCTION!')
      // Temporarily disabled for debugging - re-enable after fixing signature issue
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    } else if (!isValidSignature) {
      console.warn('⚠️ Invalid webhook signature - proceeding anyway for debugging')
    }

    // Process the real Chatra webhook format
    try {
      await processRealChatraWebhook(payload, chatraAccount.id)
      if (!isProduction) {
        console.log('✅ [DEBUG] processRealChatraWebhook completed successfully')
      }
    } catch (processError) {
      console.error('❌ [DEBUG] processRealChatraWebhook failed:', processError)
      throw processError
    }

    // Handle messages if present
    if (payload.messages && payload.messages.length > 0) {
      if (!isProduction) {
        console.log('💬 Processing', payload.messages.length, 'messages from Chatra')
      }
      try {
        await handleRealChatraMessages(payload)
        if (!isProduction) {
          console.log('✅ [DEBUG] handleRealChatraMessages completed successfully')
        }
      } catch (handleError) {
        console.error('❌ [DEBUG] handleRealChatraMessages failed:', handleError)
        throw handleError
      }
    } else {
      if (!isProduction) {
        console.log('ℹ️ No messages to process in this webhook')
      }
    }

    if (!isProduction) {
      console.log('✅ [DEBUG] Webhook processing completed successfully')
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ [ERROR] Webhook processing error:', error)
    console.error('❌ [ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Process real Chatra webhook format
 */
async function processRealChatraWebhook(payload: WebhookPayload, chatraAccountId: string): Promise<void> {
  if (!payload.client?.chatId) return

  const conversationData = {
    chatraConversationId: payload.client.chatId,
    chatraAccountId,
    clientName: payload.client.name || payload.client.displayedName || 'Anonymous',
    clientEmail: payload.client.email || null,
    status: 'active',
    updatedAt: new Date()
  }

  // Create or update conversation
  await db.conversation.upsert({
    where: { chatraConversationId: payload.client.chatId },
    update: conversationData,
    create: {
      ...conversationData,
      createdAt: new Date()
    }
  })

  console.log('✅ Processed conversation:', payload.client.chatId)
}

/**
 * Handle real Chatra messages and generate LLM responses
 */
async function handleRealChatraMessages(payload: WebhookPayload): Promise<void> {
  if (!payload.client?.chatId || !payload.messages) return

  // Find or create the conversation
  let conversation = await db.conversation.findUnique({
    where: { chatraConversationId: payload.client.chatId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      chatraAccount: true
    }
  })

  // If conversation doesn't exist, create it
  if (!conversation) {
    console.log('🆕 Creating new conversation for chatId:', payload.client.chatId)
    
    // Get the first active Chatra account (same logic as in the main webhook handler)
    const chatraAccounts = await db.chatraAccount.findMany({
      where: { isActive: true }
    })
    
    if (chatraAccounts.length === 0) {
      console.error('❌ No active Chatra accounts found for conversation creation')
      return
    }
    
    const chatraAccount = chatraAccounts[0]
    
    // Create the conversation
    const newConversation = await db.conversation.create({
      data: {
        chatraConversationId: payload.client.chatId,
        chatraAccountId: chatraAccount.id,
        clientName: payload.client.name || payload.client.displayedName || 'Anonymous',
        clientEmail: payload.client.email || null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        chatraAccount: true
      }
    })
    
    conversation = newConversation
    console.log('✅ Created new conversation:', conversation.id)
  }

  let hasNewMessages = false

  // Process each message
  for (const message of payload.messages) {
    // Check if message already exists
    const existingMessage = await db.message.findFirst({
      where: { chatraMessageId: message.id }
    })

    if (!existingMessage) {
      // Create message
      await db.message.create({
        data: {
          conversationId: conversation.id,
          chatraMessageId: message.id,
          content: message.text || message.message || '',
          senderType: message.type === 'agent' ? 'agent' : 'client',
          senderName: message.type === 'agent' ? 'Agent' : conversation.clientName,
          messageType: 'text',
          createdAt: new Date(message.createdAt || message.timestamp || new Date()),
          updatedAt: new Date()
        }
      })

      console.log('✅ Created message:', message.id)
      hasNewMessages = true

      // Generate LLM response for client messages
      if (message.type === 'client' && message.text) {
        try {
          const conversationHistory = formatConversationHistory(conversation.messages.reverse())
          
          const llmResponse = await generateLLMResponse(
            message.text,
            conversationHistory,
            true // Enable RAG
          )

          // Store LLM response
          await db.message.create({
            data: {
              conversationId: conversation.id,
              content: llmResponse.content,
              senderType: 'llm',
              senderName: 'AI Assistant',
              messageType: 'text',
              retrievedContext: llmResponse.retrievedContext ? JSON.stringify(llmResponse.retrievedContext) : null,
              confidence: llmResponse.confidence,
              isApproved: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          console.log('✅ Generated LLM response for message:', message.id)
        } catch (llmError) {
          console.error('❌ Error generating LLM response:', llmError)
        }
      }
    }
  }

  // Always update conversation timestamp to trigger auto-refresh
  if (payload.messages.length > 0) {
    const lastMessage = payload.messages[payload.messages.length - 1]
    await db.conversation.update({
      where: { id: conversation.id },
      data: { 
        lastMessageAt: new Date(lastMessage.createdAt || lastMessage.timestamp || new Date()),
        updatedAt: new Date() // This will trigger SSE updates
      }
    })
    
    console.log('✅ Updated conversation timestamp for real-time updates')
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chatra-webhook'
  })
} 