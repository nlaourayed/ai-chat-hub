/**
 * Sample Data Ingestion Script for AI Chat Hub
 * 
 * This script demonstrates how to populate the knowledge base with historical
 * conversation data. Adapt this script to work with your specific data sources.
 * 
 * Usage:
 * 1. Install dependencies: npm install
 * 2. Set up your environment variables
 * 3. Modify the script to match your data format
 * 4. Run: node scripts/sample-ingestion.js
 */

const { PrismaClient } = require('@prisma/client')

// You'll need to import these functions from your lib directory
// For this example, we'll create simplified versions
async function generateEmbedding(text) {
  const model = 'text-embedding-004'
  const apiKey = process.env.GOOGLE_AI_API_KEY
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] }
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.embedding.values
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

const prisma = new PrismaClient()

// Sample conversation data - replace with your actual data source
const sampleConversations = [
  {
    id: 'conv_1',
    messages: [
      {
        sender: 'client',
        content: 'Hello, I need help with my order. It hasn\'t arrived yet.',
        timestamp: '2024-01-15T10:00:00Z'
      },
      {
        sender: 'agent',
        content: 'I apologize for the delay. Let me check your order status. Can you please provide your order number?',
        timestamp: '2024-01-15T10:01:00Z'
      },
      {
        sender: 'client',
        content: 'Sure, it\'s ORD-12345',
        timestamp: '2024-01-15T10:02:00Z'
      },
      {
        sender: 'agent',
        content: 'Thank you! I can see your order ORD-12345 was shipped 3 days ago via standard shipping. It should arrive within 5-7 business days. You can track it using this number: TRK123456789',
        timestamp: '2024-01-15T10:03:00Z'
      }
    ],
    metadata: {
      topic: 'order_inquiry',
      resolved: true,
      satisfaction: 5
    }
  },
  {
    id: 'conv_2',
    messages: [
      {
        sender: 'client',
        content: 'I want to return a product I bought last week',
        timestamp: '2024-01-16T14:30:00Z'
      },
      {
        sender: 'agent',
        content: 'I\'d be happy to help you with your return. What\'s the reason for the return, and do you have your order number?',
        timestamp: '2024-01-16T14:31:00Z'
      },
      {
        sender: 'client',
        content: 'The item doesn\'t fit properly. Order number is ORD-67890',
        timestamp: '2024-01-16T14:32:00Z'
      },
      {
        sender: 'agent',
        content: 'No problem! Since it\'s within our 30-day return window, I\'ll send you a prepaid return label. You should receive it via email within 10 minutes. Once we receive the item, your refund will be processed within 3-5 business days.',
        timestamp: '2024-01-16T14:33:00Z'
      }
    ],
    metadata: {
      topic: 'return_request',
      resolved: true,
      satisfaction: 4
    }
  }
]

/**
 * Process a conversation and create knowledge base entries
 */
async function processConversation(conversation) {
  const { id, messages, metadata } = conversation
  
  console.log(`Processing conversation ${id}...`)
  
  // Strategy 1: Individual messages as chunks
  for (const message of messages) {
    if (message.sender === 'agent') {
      // Only store agent responses as they contain the knowledge we want to reuse
      try {
        const embedding = await generateEmbedding(message.content)
        
        await prisma.knowledgeBase.create({
          data: {
            content: message.content,
            source: 'sample_conversation',
            sourceId: id,
            metadata: {
              ...metadata,
              messageType: 'agent_response',
              timestamp: message.timestamp,
              conversationId: id
            },
            embedding: `[${embedding.join(',')}]`
          }
        })
        
        console.log(`  ✓ Embedded agent message: ${message.content.substring(0, 50)}...`)
      } catch (error) {
        console.error(`  ✗ Failed to embed message: ${error.message}`)
      }
      
      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Strategy 2: Q&A pairs
  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i]
    const answer = messages[i + 1]
    
    if (question.sender === 'client' && answer.sender === 'agent') {
      const qaPair = `Q: ${question.content}\nA: ${answer.content}`
      
      try {
        const embedding = await generateEmbedding(qaPair)
        
        await prisma.knowledgeBase.create({
          data: {
            content: qaPair,
            source: 'sample_conversation',
            sourceId: id,
            metadata: {
              ...metadata,
              messageType: 'qa_pair',
              questionTimestamp: question.timestamp,
              answerTimestamp: answer.timestamp,
              conversationId: id
            },
            embedding: `[${embedding.join(',')}]`
          }
        })
        
        console.log(`  ✓ Embedded Q&A pair: ${question.content.substring(0, 30)}...`)
      } catch (error) {
        console.error(`  ✗ Failed to embed Q&A pair: ${error.message}`)
      }
      
      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Strategy 3: Conversation summary
  const summary = `Topic: ${metadata.topic}\n` +
    `Conversation Summary: A customer inquiry about ${metadata.topic.replace('_', ' ')} that was ` +
    `${metadata.resolved ? 'successfully resolved' : 'left unresolved'} with satisfaction rating ${metadata.satisfaction}/5.\n` +
    `Key messages: ${messages.filter(m => m.sender === 'agent').map(m => m.content).join(' ')}`
  
  try {
    const embedding = await generateEmbedding(summary)
    
    await prisma.knowledgeBase.create({
      data: {
        content: summary,
        source: 'sample_conversation',
        sourceId: id,
        metadata: {
          ...metadata,
          messageType: 'conversation_summary',
          conversationId: id
        },
        embedding: `[${embedding.join(',')}]`
      }
    })
    
    console.log(`  ✓ Embedded conversation summary`)
  } catch (error) {
    console.error(`  ✗ Failed to embed summary: ${error.message}`)
  }
}

/**
 * Main ingestion function
 */
async function main() {
  try {
    console.log('🚀 Starting sample data ingestion...')
    
    // Clear existing sample data (optional)
    await prisma.knowledgeBase.deleteMany({
      where: { source: 'sample_conversation' }
    })
    console.log('Cleared existing sample data')
    
    // Process each conversation
    for (const conversation of sampleConversations) {
      await processConversation(conversation)
    }
    
    // Display results
    const totalEntries = await prisma.knowledgeBase.count()
    const sampleEntries = await prisma.knowledgeBase.count({
      where: { source: 'sample_conversation' }
    })
    
    console.log('\n✅ Ingestion completed!')
    console.log(`📊 Total knowledge base entries: ${totalEntries}`)
    console.log(`🆕 New sample entries added: ${sampleEntries}`)
    
    // Test vector search
    console.log('\n🔍 Testing vector search...')
    await testVectorSearch()
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Test vector search functionality
 */
async function testVectorSearch() {
  try {
    const testQuery = "I need help with my order"
    const queryEmbedding = await generateEmbedding(testQuery)
    const embeddingString = `[${queryEmbedding.join(',')}]`
    
    const results = await prisma.$queryRaw`
      SELECT 
        content,
        source,
        metadata,
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM knowledge_base 
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingString}::vector
      LIMIT 3
    `
    
    console.log(`Query: "${testQuery}"`)
    console.log('Top results:')
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. (${(result.similarity * 100).toFixed(1)}% match) ${result.content.substring(0, 100)}...`)
    })
    
  } catch (error) {
    console.error('Vector search test failed:', error)
  }
}

/**
 * Alternative: Ingest from Chatra API
 * Uncomment and modify this function to fetch real data from Chatra
 */
/*
async function ingestFromChatraAPI() {
  const chatraApiKey = process.env.CHATRA_API_KEY
  const chatraAccountId = process.env.CHATRA_ACCOUNT_ID
  
  try {
    // Fetch conversations from Chatra API
    const response = await fetch(`https://app.chatra.io/api/v1/conversations?account_id=${chatraAccountId}`, {
      headers: {
        'Authorization': `Bearer ${chatraApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Chatra API error: ${response.statusText}`)
    }
    
    const conversations = await response.json()
    
    // Process each conversation
    for (const conversation of conversations.data) {
      // Transform Chatra format to our format and process
      await processConversation(transformChatraConversation(conversation))
    }
    
  } catch (error) {
    console.error('Failed to ingest from Chatra API:', error)
  }
}

function transformChatraConversation(chatraConv) {
  // Transform Chatra conversation format to our internal format
  return {
    id: chatraConv.id,
    messages: chatraConv.messages.map(msg => ({
      sender: msg.sender.type, // 'client' or 'agent'
      content: msg.text,
      timestamp: msg.created_at
    })),
    metadata: {
      topic: 'chatra_import',
      resolved: chatraConv.status === 'closed',
      chatraId: chatraConv.id
    }
  }
}
*/

// Run the ingestion
if (require.main === module) {
  main()
}

module.exports = {
  processConversation,
  generateEmbedding
} 