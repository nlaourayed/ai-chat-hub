import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  content: string
  senderType: string
  createdAt: Date
}

interface Conversation {
  id: string
  chatraConversationId: string
  clientName?: string | null
  clientEmail?: string | null
  status: string
  lastMessageAt?: Date | null
  messages: Message[]
  chatraAccount: {
    name: string
    id: string
  }
}

interface ConversationListProps {
  conversations: Conversation[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-600 mb-4">
              Conversations will appear here once your Chatra accounts start receiving messages.
            </p>
            <p className="text-sm text-gray-500">
              Make sure your webhook is configured to receive real-time updates.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Conversations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[0]
            const clientDisplay = conversation.clientName || conversation.clientEmail || 'Anonymous'
            
            return (
              <div
                key={conversation.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {clientDisplay}
                    </h4>
                    <Badge 
                      variant={conversation.status === 'active' ? 'default' : 'secondary'}
                    >
                      {conversation.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {conversation.chatraAccount.name}
                    </span>
                  </div>
                  
                  {lastMessage && (
                    <p className="text-sm text-gray-600 truncate">
                      {lastMessage.senderType === 'client' ? '👤' : 
                       lastMessage.senderType === 'llm' ? '🤖' : '👨‍💼'} {lastMessage.content}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2">
                    {conversation.clientEmail && (
                      <span className="text-xs text-gray-500">
                        {conversation.clientEmail}
                      </span>
                    )}
                    {conversation.lastMessageAt && (
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.lastMessageAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0 ml-4">
                  <Link href={`/dashboard/conversation/${conversation.id}`}>
                    <Button variant="outline" size="sm">
                      View Chat
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 