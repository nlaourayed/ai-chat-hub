import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/chatra'
import { generateLLMResponse, formatConversationHistory } from '@/lib/llm'
import { db } from '@/lib/db'
import type { ChatraWebhookPayload as WebhookPayload, LLMResponse, ChatraMessage } from '@/types'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
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
    const signature = request.headers.get('x-chatra-signature') || request.headers.get('x-hub-signature-256') || ''
    
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

    // Get configured Chatra account
    const chatraAccount = await db.chatraAccount.findUnique({
      where: { chatraId: 'ZRX3EvWsmnPNr6m9x' }
    })

    if (!chatraAccount) {
      console.error('❌ Configured Chatra account not found: ZRX3EvWsmnPNr6m9x')
      return NextResponse.json({ error: 'Account not configured' }, { status: 404 })
    }

    if (!isProduction) {
      console.log('✅ [DEBUG] Found Chatra account:', chatraAccount.name)
    }

    // Verify webhook signature (enabled in production)
    const isValidSignature = verifyWebhookSignature(body, signature, chatraAccount.webhookSecret)
    if (isProduction && !isValidSignature) {
      console.warn('⚠️ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    } else if (!isProduction && !isValidSignature) {
      console.warn('⚠️ Invalid webhook signature - proceeding anyway for development')
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
        await handleRealChatraMessages(payload, chatraAccount.id)
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
async function handleRealChatraMessages(payload: WebhookPayload, chatraAccountId: string): Promise<void> {
  if (!payload.client?.chatId || !payload.messages) return

  // Find the conversation
  const conversation = await db.conversation.findUnique({
    where: { chatraConversationId: payload.client.chatId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      chatraAccount: true
    }
  })

  if (!conversation) {
    console.error('Conversation not found:', payload.client.chatId)
    return
  }

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

  // Update conversation timestamp
  if (payload.messages.length > 0) {
    const lastMessage = payload.messages[payload.messages.length - 1]
    await db.conversation.update({
      where: { id: conversation.id },
      data: { 
        lastMessageAt: new Date(lastMessage.createdAt || lastMessage.timestamp || new Date()),
        updatedAt: new Date()
      }
    })
  }
}

/**
 * Handle new message events and generate LLM responses
 * Updated for correct Chatra chatFragment webhook structure
 */
async function handleNewMessage(payload: WebhookPayload) {
  try {
    if (!payload.data?.id || !payload.data?.messages) {
      return // No conversation ID or messages to process
    }

    // Get the latest client message from the fragment
    const clientMessages = payload.data.messages.filter((msg: ChatraMessage) => msg.type === 'client')
    if (clientMessages.length === 0) {
      return // No client messages to respond to
    }

    const latestClientMessage = clientMessages[clientMessages.length - 1]

    // Find the conversation in our database
    const conversation = await db.conversation.findUnique({
      where: { chatraConversationId: payload.data.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Get last 10 messages for context
        },
        chatraAccount: true
      }
    })

    if (!conversation) {
      console.error('Conversation not found:', payload.data.id)
      return
    }

    // Format conversation history for LLM
    const conversationHistory = formatConversationHistory(conversation.messages.reverse())

    // Generate LLM response using RAG
    let llmResponse: LLMResponse
    try {
      llmResponse = await generateLLMResponse(
        latestClientMessage.text || '',
        conversationHistory,
        true // Enable RAG
      )
    } catch (llmError) {
      console.error('Error generating LLM response:', llmError)
      // Fallback to a simple response
      llmResponse = {
        content: "I apologize, but I'm having trouble processing your request right now. A human agent will assist you shortly.",
        confidence: 0.3
      }
    }

    // Store the LLM-generated message in database
    await db.message.create({
      data: {
        conversationId: conversation.id,
        content: llmResponse.content,
        senderType: 'llm',
        senderName: 'AI Assistant',
        messageType: 'text',
        retrievedContext: llmResponse.retrievedContext ? JSON.stringify(llmResponse.retrievedContext) : null,
        confidence: llmResponse.confidence,
        isApproved: null // Pending human approval
      }
    })

    // Note: In a real implementation, you might want to:
    // 1. Send the response immediately if confidence is high
    // 2. Queue for human review if confidence is low
    // 3. Use WebSocket or Server-Sent Events to notify the dashboard

    console.log('LLM response generated and stored for conversation:', payload.data.id)
  } catch (error) {
    console.error('Error handling new message:', error)
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