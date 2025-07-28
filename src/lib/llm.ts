import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from './db'
import type { RetrievedContext, LLMResponse } from '@/types'

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

/**
 * Generate embedding for a text using Google's text-embedding-004 model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = 'text-embedding-004'
    const apiKey = process.env.GOOGLE_EMBEDDING_API_KEY || process.env.GOOGLE_AI_API_KEY
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{ text }]
        }
      })
    })

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

/**
 * Retrieve relevant context from the knowledge base using vector similarity search
 */
export async function retrieveContext(
  query: string, 
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<RetrievedContext[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)
    
    // Convert embedding to pgvector format
    const embeddingString = `[${queryEmbedding.join(',')}]`
    
    // Perform vector similarity search
    // Note: This uses raw SQL because Prisma doesn't natively support vector operations yet
    // We store embeddings as text strings, so we need to cast them back to vectors for comparison
    const results = await db.$queryRaw`
      SELECT 
        id,
        content,
        source,
        source_id,
        metadata,
        1 - (embedding::vector <=> ${embeddingString}::vector) as similarity
      FROM knowledge_base 
      WHERE embedding IS NOT NULL
        AND embedding != ''
        AND 1 - (embedding::vector <=> ${embeddingString}::vector) > ${similarityThreshold}
      ORDER BY embedding::vector <=> ${embeddingString}::vector
      LIMIT ${limit}
    ` as Array<{
      id: string;
      content: string;
      source: string;
      source_id?: string;
      metadata?: Record<string, unknown>;
      similarity: number;
    }>

    return results.map((row) => ({
      content: row.content,
      source: row.source,
      sourceId: row.source_id,
      similarity: typeof row.similarity === 'string' ? parseFloat(row.similarity) : row.similarity,
      metadata: row.metadata
    }))
  } catch (error) {
    console.error('Error retrieving context:', error)
    // Return empty array if knowledge base is not populated or there's an error
    return []
  }
}

/**
 * Construct an augmented prompt with retrieved context
 */
export function constructPrompt(
  userMessage: string,
  conversationHistory: string[],
  retrievedContext: RetrievedContext[]
): string {
  let prompt = `You are a helpful customer service assistant. You should provide accurate, professional, and empathetic responses to customer inquiries.

CONTEXT FROM PREVIOUS CONVERSATIONS:
`

  if (retrievedContext.length > 0) {
    retrievedContext.forEach((context, index) => {
      prompt += `\n[Context ${index + 1}] (Source: ${context.source}, Similarity: ${(context.similarity || 0).toFixed(2)})
${context.content}
`
    })
  } else {
    prompt += "\nNo relevant context found in knowledge base. Provide a helpful general response.\n"
  }

  prompt += `
CONVERSATION HISTORY:
`
  
  if (conversationHistory.length > 0) {
    conversationHistory.forEach((message, index) => {
      prompt += `${index + 1}. ${message}\n`
    })
  } else {
    prompt += "This is the start of the conversation.\n"
  }

  prompt += `
CURRENT USER MESSAGE:
${userMessage}

INSTRUCTIONS:
- Use the context from previous conversations to inform your response when relevant
- Maintain a professional and empathetic tone
- If you don't have enough information to answer accurately, ask clarifying questions
- Keep responses concise but complete
- If the context provides specific information relevant to the user's query, reference it appropriately

Please provide a helpful response to the user's message:`

  return prompt
}

/**
 * Generate LLM response using Gemini 2.5 Flash-Lite with RAG
 */
export async function generateLLMResponse(
  userMessage: string,
  conversationHistory: string[] = [],
  useRAG: boolean = true
): Promise<LLMResponse> {
  try {
    let retrievedContext: RetrievedContext[] = []
    
    // Retrieve relevant context if RAG is enabled
    if (useRAG) {
      retrievedContext = await retrieveContext(userMessage)
    }
    
    // Construct the augmented prompt
    const prompt = constructPrompt(userMessage, conversationHistory, retrievedContext)
    
    // Initialize the model
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
    })
    
    // Generate response
    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()
    
    return {
      content: content.trim(),
      confidence: 0.8, // Placeholder confidence score
      retrievedContext: retrievedContext.length > 0 ? retrievedContext : undefined
    }
  } catch (error) {
    console.error('Error generating LLM response:', error)
    throw error
  }
}

/**
 * Utility function to format conversation history for the LLM
 */
export function formatConversationHistory(messages: Array<{
  senderType: string;
  content: string;
}>): string[] {
  return messages
    .slice(-10) // Limit to last 10 messages for context
    .map(msg => {
      const sender = msg.senderType === 'client' ? 'Customer' : 
                    msg.senderType === 'agent' ? 'Agent' : 'Assistant'
      return `${sender}: ${msg.content}`
    })
}

/**
 * Placeholder function for when knowledge base is not yet populated
 */
export async function generatePlaceholderResponse(userMessage: string): Promise<LLMResponse> {
  const placeholderPrompt = `You are a customer service assistant. The user said: "${userMessage}". 
  
  Since this is a demo system and the knowledge base is not yet populated with historical conversations, 
  please provide a helpful, professional response that acknowledges this is a demonstration system.
  
  Keep the response concise and helpful.`
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
    })
    
    const result = await model.generateContent(placeholderPrompt)
    const response = await result.response
    const content = response.text()
    
    return {
      content: content.trim(),
      confidence: 0.6,
      retrievedContext: []
    }
  } catch (error) {
    console.error('Error generating placeholder response:', error)
    return {
      content: "Thank you for your message. I'm here to help you. Could you please provide more details about what you need assistance with?",
      confidence: 0.5,
      retrievedContext: []
    }
  }
} 