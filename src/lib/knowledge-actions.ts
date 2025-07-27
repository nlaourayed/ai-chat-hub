'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { db } from './db'
import { generateEmbedding } from './llm'
import type { KnowledgeBaseCreateData, KnowledgeBaseUpdateData, ApiResponse, KnowledgeBaseEntry } from '@/types'
import { Prisma } from '@prisma/client'

/**
 * Add a new knowledge base entry
 */
export async function addKnowledgeEntry(data: KnowledgeBaseCreateData): Promise<ApiResponse<KnowledgeBaseEntry>> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(data.content)
    
    const entry = await db.knowledgeBase.create({
      data: {
        content: data.content,
        source: data.source,
        sourceId: data.sourceId || null,
        metadata: (data.metadata || null) as Prisma.InputJsonValue, // Required for Prisma Json field type
        embedding: `[${embedding.join(',')}]`
      }
    })

    revalidatePath('/dashboard/knowledge-base')
    return { success: true, data: entry }
  } catch (error) {
    console.error('Error adding knowledge entry:', error)
    throw error
  }
}

/**
 * Update an existing knowledge base entry
 */
export async function updateKnowledgeEntry(id: string, data: KnowledgeBaseUpdateData): Promise<ApiResponse<KnowledgeBaseEntry>> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const updateData: Record<string, unknown> = {}
    
    if (data.content !== undefined) {
      updateData.content = data.content
      // Regenerate embedding if content changed
      const embedding = await generateEmbedding(data.content)
      updateData.embedding = `[${embedding.join(',')}]`
    }
    
    if (data.source !== undefined) updateData.source = data.source
    if (data.sourceId !== undefined) updateData.sourceId = data.sourceId
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue // Required for Prisma Json field type
    
    updateData.updatedAt = new Date()

    const entry = await db.knowledgeBase.update({
      where: { id },
      data: updateData
    })

    revalidatePath('/dashboard/knowledge-base')
    return { success: true, data: entry }
  } catch (error) {
    console.error('Error updating knowledge entry:', error)
    throw error
  }
}

/**
 * Delete a knowledge base entry
 */
export async function deleteKnowledgeEntry(id: string): Promise<ApiResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    await db.knowledgeBase.delete({
      where: { id }
    })

    revalidatePath('/dashboard/knowledge-base')
    return { success: true }
  } catch (error) {
    console.error('Error deleting knowledge entry:', error)
    throw error
  }
}

/**
 * Bulk delete knowledge base entries
 */
export async function bulkDeleteKnowledgeEntries(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    await db.knowledgeBase.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    revalidatePath('/dashboard/knowledge-base')
    return { success: true, data: { deletedCount: ids.length } }
  } catch (error) {
    console.error('Error bulk deleting knowledge entries:', error)
    throw error
  }
}

/**
 * Import knowledge entries from conversations
 */
export async function importFromConversations(): Promise<ApiResponse<{ importedCount: number }>> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    // Get conversations with messages
    const conversations = await db.conversation.findMany({
      include: {
        messages: {
          where: {
            senderType: 'agent',
            content: { not: '' }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    let importedCount = 0

    for (const conversation of conversations) {
      // Create Q&A pairs from client-agent interactions
      const messages = conversation.messages
      
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i]
        const nextMsg = messages[i + 1]
        
        if (currentMsg.senderType === 'client' && nextMsg.senderType === 'agent') {
          const qaPair = `Q: ${currentMsg.content}\nA: ${nextMsg.content}`
          
          // Check if this content already exists
          const existing = await db.knowledgeBase.findFirst({
            where: {
              content: qaPair,
              sourceId: conversation.id
            }
          })
          
          if (!existing) {
            const embedding = await generateEmbedding(qaPair)
            
            await db.knowledgeBase.create({
              data: {
                content: qaPair,
                source: 'conversation_import',
                sourceId: conversation.id,
                metadata: {
                  conversationId: conversation.id,
                  clientName: conversation.clientName,
                  clientEmail: conversation.clientEmail,
                  importedAt: new Date().toISOString()
                },
                embedding: `[${embedding.join(',')}]`
              }
            })
            
            importedCount++
          }
        }
      }
      
      // Small delay to avoid overwhelming the embedding API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    revalidatePath('/dashboard/knowledge-base')
    return { success: true, data: { importedCount } }
  } catch (error) {
    console.error('Error importing from conversations:', error)
    throw error
  }
} 