/**
 * Import Chatra Conversations Script
 * 
 * This script imports existing conversations from your Chatra account
 * Usage: node scripts/import-chatra-conversations.js
 */

const { PrismaClient } = require('@prisma/client')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function importChatraConversations() {
  try {
    console.log('📞 Import Existing Chatra Conversations\n')
    
    // Get Chatra API credentials
    const chatraId = await question('Enter your Chatra Account ID: ')
    const apiKey = await question('Enter your Chatra API Key: ')
    const accountName = await question('Enter a friendly name for this account: ')
    const webhookSecret = await question('Enter webhook secret (for future webhooks): ')
    
    console.log('\n🔍 Fetching conversations from Chatra...')
    
    // First, create/update the Chatra account in our database
    const chatraAccount = await prisma.chatraAccount.upsert({
      where: { chatraId },
      update: {
        name: accountName,
        apiKey,
        webhookSecret,
        isActive: true
      },
      create: {
        name: accountName,
        chatraId,
        apiKey,
        webhookSecret,
        isActive: true
      }
    })
    
    console.log('✅ Chatra account configured:', chatraAccount.name)
    
    // Fetch conversations from Chatra API
    const conversationsResponse = await fetch(`https://app.chatra.io/api/v1/conversations?limit=50`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!conversationsResponse.ok) {
      throw new Error(`Chatra API error: ${conversationsResponse.status} ${conversationsResponse.statusText}`)
    }
    
    const conversationsData = await conversationsResponse.json()
    console.log(`📥 Found ${conversationsData.data?.length || 0} conversations`)
    
    if (!conversationsData.data || conversationsData.data.length === 0) {
      console.log('❌ No conversations found. Make sure your API key has the right permissions.')
      return
    }
    
    let importedCount = 0
    let skippedCount = 0
    
    for (const chatraConv of conversationsData.data) {
      try {
        // Check if conversation already exists
        const existingConv = await prisma.conversation.findUnique({
          where: { chatraConversationId: chatraConv.id }
        })
        
        if (existingConv) {
          console.log(`⏭️  Skipping existing conversation: ${chatraConv.id}`)
          skippedCount++
          continue
        }
        
        // Create conversation
        const conversation = await prisma.conversation.create({
          data: {
            chatraConversationId: chatraConv.id,
            chatraAccountId: chatraAccount.id,
            clientName: chatraConv.client?.name || null,
            clientEmail: chatraConv.client?.email || null,
            status: chatraConv.status || 'active',
            lastMessageAt: chatraConv.updated_at ? new Date(chatraConv.updated_at) : null,
            createdAt: chatraConv.created_at ? new Date(chatraConv.created_at) : new Date(),
            updatedAt: new Date()
          }
        })
        
        console.log(`✅ Imported conversation: ${chatraConv.id} (${chatraConv.client?.name || 'Anonymous'})`)
        
        // Fetch messages for this conversation
        const messagesResponse = await fetch(`https://app.chatra.io/api/v1/conversations/${chatraConv.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          
          if (messagesData.data && messagesData.data.length > 0) {
            for (const chatraMsg of messagesData.data) {
              await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  chatraMessageId: chatraMsg.id,
                  content: chatraMsg.text || '',
                  senderType: chatraMsg.sender?.type || 'client',
                  senderName: chatraMsg.sender?.name || null,
                  messageType: chatraMsg.type || 'text',
                  createdAt: chatraMsg.created_at ? new Date(chatraMsg.created_at) : new Date()
                }
              })
            }
            console.log(`   📝 Imported ${messagesData.data.length} messages`)
          }
        }
        
        importedCount++
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error importing conversation ${chatraConv.id}:`, error.message)
      }
    }
    
    console.log('\n🎉 Import completed!')
    console.log(`✅ Imported: ${importedCount} conversations`)
    console.log(`⏭️  Skipped: ${skippedCount} existing conversations`)
    
    console.log('\n📊 Updated dashboard stats:')
    const totalConversations = await prisma.conversation.count()
    const totalMessages = await prisma.message.count()
    console.log(`- Total conversations: ${totalConversations}`)
    console.log(`- Total messages: ${totalMessages}`)
    
    console.log('\n🚀 Next steps:')
    console.log('1. Refresh your dashboard to see the imported conversations')
    console.log('2. Set up webhook URL in Chatra: https://your-domain.com/api/chatra-webhook')
    console.log('3. Run the sample ingestion script to populate knowledge base:')
    console.log('   node scripts/sample-ingestion.js')
    
  } catch (error) {
    console.error('❌ Import failed:', error.message)
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 API Authentication Error:')
      console.log('- Check that your Chatra API key is correct')
      console.log('- Ensure your API key has read permissions for conversations')
      console.log('- Verify your Chatra Account ID is correct')
    }
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

// Run the import
importChatraConversations() 