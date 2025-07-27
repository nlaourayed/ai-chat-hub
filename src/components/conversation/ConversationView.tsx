'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft } from 'lucide-react'
import type { ConversationViewProps } from '@/types'

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

  const handleApproveResponse = async (messageId: string) => {
    try {
      const { approveMessage } = await import('@/lib/actions')
      await approveMessage(messageId, true) // Auto-extract to knowledge base
      window.location.reload() // Simple refresh to show changes
    } catch (error) {
      console.error('Error approving response:', error)
      alert('Failed to approve response. Please try again.')
    }
  }

  const handleRejectResponse = async (messageId: string) => {
    try {
      const { rejectMessage } = await import('@/lib/actions')
      await rejectMessage(messageId)
      window.location.reload() // Simple refresh to show changes
    } catch (error) {
      console.error('Error rejecting response:', error)
      alert('Failed to reject response. Please try again.')
    }
  }

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditedContent(currentContent)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editedContent.trim()) return
    
    try {
      const { updateMessageContent } = await import('@/lib/actions')
      await updateMessageContent(messageId, editedContent)
      setEditingMessageId(null)
      setEditedContent('')
      window.location.reload() // Simple refresh to show changes
    } catch (error) {
      console.error('Error updating message:', error)
      alert('Failed to update message. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditedContent('')
  }

  const clientDisplay = conversation.clientName || conversation.clientEmail || 'Anonymous User'

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
              <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                {conversation.status}
              </Badge>
              <span className="text-sm text-gray-500">
                {conversation.chatraAccount.name}
              </span>
              {conversation.clientEmail && (
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
                  {conversation.messages.map((message) => (
                    <div
                      key={message.id}
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
                                ✗ Cancel
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
                          {message.senderType === 'llm' && message.isApproved === null && (
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={() => handleApproveResponse(message.id)}
                                  >
                                    ✓ Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={() => handleRejectResponse(message.id)}
                                  >
                                    ✗ Reject
                                  </Button>
                                </>
                              ) : null}
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
          {conversation.messages
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