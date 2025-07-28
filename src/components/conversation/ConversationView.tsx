'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft } from 'lucide-react'
import type { ConversationViewProps } from '@/types'
import { approveMessage, rejectMessage, updateMessageContent } from '@/lib/actions'

export function ConversationView({ conversation }: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    setIsLoading(true)
    try {
      // Here you would implement the API call to send a message
      // For now, this is a placeholder
      console.log('Sending message:', newMessage)
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveResponse = useCallback(async (messageId: string) => {
    if (!messageId) {
      alert('Invalid message ID')
      return
    }
    
    try {
      console.log('🔄 Approving message:', messageId)
      const result = await approveMessage(messageId, true)
      console.log('✅ Approve result:', result)
      
      // Instead of page reload, try to refresh just this component
      window.location.reload()
    } catch (error) {
      console.error('❌ Error approving response:', error)
      alert(`Failed to approve response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const handleRejectResponse = useCallback(async (messageId: string) => {
    if (!messageId) {
      alert('Invalid message ID')
      return
    }
    
    try {
      console.log('🔄 Rejecting message:', messageId)
      const result = await rejectMessage(messageId)
      console.log('✅ Reject result:', result)
      
      // Instead of page reload, try to refresh just this component
      window.location.reload()
    } catch (error) {
      console.error('❌ Error rejecting response:', error)
      alert(`Failed to reject response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const handleEditMessage = useCallback((messageId: string, currentContent: string) => {
    if (!messageId || !currentContent) {
      alert('Invalid message data')
      return
    }
    setEditingMessageId(messageId)
    setEditedContent(currentContent)
  }, [])

  const handleSaveEdit = useCallback(async (messageId: string) => {
    if (!editedContent.trim()) {
      alert('Message content cannot be empty')
      return
    }
    
    try {
      console.log('🔄 Updating message:', messageId, 'with content:', editedContent.substring(0, 50) + '...')
      const result = await updateMessageContent(messageId, editedContent)
      console.log('✅ Update result:', result)
      
      setEditingMessageId(null)
      setEditedContent('')
      window.location.reload()
    } catch (error) {
      console.error('❌ Error updating message:', error)
      alert(`Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [editedContent])

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditedContent('')
  }, [])

  // Safety check for undefined conversation AFTER hooks
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conversation not found</h2>
          <p className="text-gray-600">The requested conversation could not be loaded.</p>
          <Link href="/dashboard" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const clientDisplay = conversation?.clientName || conversation?.clientEmail || 'Anonymous User'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {clientDisplay}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={conversation?.status === 'active' ? 'default' : 'secondary'}>
                {conversation?.status || 'unknown'}
              </Badge>
              <span className="text-sm text-gray-500">
                {conversation?.chatraAccount?.name || 'Unknown Account'}
              </span>
              {conversation?.clientEmail && (
                <span className="text-sm text-gray-500">
                  • {conversation.clientEmail}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4 pr-4">
                  {(conversation?.messages || []).map((message, index) => (
                    <div
                      key={message.id || `message-${index}`}
                      className={`flex ${
                        message.senderType === 'client' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderType === 'client'
                            ? 'bg-gray-100 text-gray-900'
                            : message.senderType === 'llm'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-green-100 text-green-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium">
                            {message.senderType === 'client' ? '👤 Client' : 
                             message.senderType === 'llm' ? '🤖 AI Assistant' : 
                             '👨‍💼 Agent'}
                          </span>
                          {message.confidence && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(message.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        {editingMessageId === message.id ? (
                          // Edit mode
                          <div className="space-y-2">
                            <Textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="text-xs px-2 py-1 h-6"
                                onClick={() => handleSaveEdit(message.id)}
                                disabled={!editedContent.trim()}
                              >
                                💾 Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1 h-6"
                                onClick={handleCancelEdit}
                              >
                                ❌ Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                          
                          {/* LLM Response Actions */}
                          {message.senderType === 'llm' && message.id && (
                            <div className="flex space-x-2">
                              {editingMessageId !== message.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={() => handleEditMessage(message.id, message.content)}
                                  >
                                    ✏️ Edit
                                  </Button>
                                  
                                  {/* Show approve/reject for pending messages or allow re-approval */}
                                  {(message.isApproved === null || message.isApproved === false) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={() => handleApproveResponse(message.id)}
                                    >
                                      ✓ Approve
                                    </Button>
                                  )}
                                  
                                  {(message.isApproved === null || message.isApproved === true) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={() => handleRejectResponse(message.id)}
                                    >
                                      ✗ Reject
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-500">Editing...</span>
                              )}
                            </div>
                          )}
                          
                          {/* Approval Status */}
                          {message.senderType === 'llm' && message.isApproved !== null && (
                            <Badge 
                              variant={message.isApproved ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {message.isApproved ? 'Approved' : 'Rejected'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Message Input */}
              <div className="mt-4 space-y-3">
                <Textarea
                  placeholder="Type your response..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !newMessage.trim()}
                  >
                    {isLoading ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - RAG Context Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Assistant Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="font-medium">Status:</span>{' '}
                <Badge variant="secondary" className="text-xs">
                  RAG Enabled
                </Badge>
              </div>
              <div>
                <span className="font-medium">Model:</span> Gemini 2.5 Flash-Lite
              </div>
              <div>
                <span className="font-medium">Knowledge Base:</span> {' '}
                {/* This would show knowledge base stats */}
                <span className="text-gray-600">Ready</span>
              </div>
            </CardContent>
          </Card>

          {/* Show RAG context for LLM messages */}
          {(conversation?.messages || [])
            .filter(m => m.senderType === 'llm' && m.retrievedContext)
            .slice(-1)
            .map((message) => {
              let contexts: Array<{
                content: string;
                source: string;
                similarity?: number;
              }> = []
              try {
                contexts = JSON.parse(message.retrievedContext || '[]')
              } catch {
                // Handle parse error
              }
              
              if (contexts.length === 0) return null

              return (
                <Card key={message.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">Retrieved Context</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    {contexts.map((context, index: number) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {Math.round((context.similarity || 0) * 100)}% match
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {context.source}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-3">
                          {context.content}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
} 