// User and Authentication Types
export interface User {
  id: string
  email: string
  name?: string | null
  role: string
  createdAt: Date
  updatedAt: Date
}

// Session User type (for NextAuth compatibility)
export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: string
}

// Chatra Types
export interface ChatraAccount {
  id: string
  name: string
  chatraId: string
  apiKey: string
  webhookSecret: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ChatraClient {
  chatId?: string
  name?: string
  displayedName?: string
  email?: string
  info?: {
    email?: string
    name?: string
  }
}

export interface ChatraMessage {
  id: string
  text?: string
  message?: string
  type: 'client' | 'agent' | 'system'
  agentName?: string
  createdAt: string
  timestamp?: string
}

export interface ChatraWebhookPayload {
  chatId?: string
  id?: string
  client?: ChatraClient
  messages?: ChatraMessage[]
  data?: {
    id: string
    client?: ChatraClient
    messages?: ChatraMessage[]
  }
}

// Message Types
export interface Message {
  id: string
  conversationId: string
  chatraMessageId?: string | null
  content: string
  senderType: 'client' | 'agent' | 'llm'
  senderName?: string | null
  messageType: string
  retrievedContext?: string | null
  confidence?: number | null
  isApproved?: boolean | null
  createdAt: Date
  updatedAt: Date
}

// Conversation Types
export interface Conversation {
  id: string
  chatraConversationId: string
  chatraAccountId: string
  clientName?: string | null
  clientEmail?: string | null
  status: string
  lastMessageAt?: Date | null
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  chatraAccount: ChatraAccount
}

// Knowledge Base Types
export interface KnowledgeBaseMetadata {
  conversationId?: string
  clientMessageId?: string
  approvedMessageId?: string
  clientName?: string | null
  clientEmail?: string | null
  approvedAt?: string
  importedAt?: string
  type?: string
  isTestEntry?: boolean
  createdBy?: string
  addedManually?: boolean
  lastModified?: string
  [key: string]: unknown // Allow additional metadata
}

export interface KnowledgeBaseEntry {
  id: string
  content: string
  source: string
  sourceId?: string | null
  metadata?: unknown | null // Use unknown to match Prisma's JsonValue
  embedding: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeBaseCreateData {
  content: string
  source: string
  sourceId?: string
  metadata?: KnowledgeBaseMetadata
}

export interface KnowledgeBaseUpdateData {
  content?: string
  source?: string
  sourceId?: string
  metadata?: KnowledgeBaseMetadata
}

// LLM Types
export interface RetrievedContext {
  content: string
  source: string
  sourceId?: string
  similarity?: number
  metadata?: KnowledgeBaseMetadata
}

export interface LLMResponse {
  content: string
  confidence?: number
  retrievedContext?: RetrievedContext[]
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface KnowledgeBaseStats {
  totalEntries: number
  sources: Array<{
    source: string
    _count: { source: number }
  }>
}

// Component Props Types
export interface ConversationViewProps {
  conversation: Conversation
  user: SessionUser
}

export interface KnowledgeBaseManagerProps {
  entries: KnowledgeBaseEntry[]
  stats: KnowledgeBaseStats
}

export interface DashboardHeaderProps {
  user: User
}

// Form Data Types
export interface MessageContentUpdate {
  messageId: string
  newContent: string
}

export interface MessageApproval {
  messageId: string
  extractToKnowledge?: boolean
}

// Database Query Types
export interface ConversationWithMessages extends Conversation {
  messages: Message[]
  chatraAccount: ChatraAccount
}

export interface MessageWithConversation extends Message {
  conversation: ConversationWithMessages
}

// Webhook Processing Types
export interface WebhookProcessingResult {
  success: boolean
  messagesProcessed: number
  conversationId?: string
  errors?: string[]
} 