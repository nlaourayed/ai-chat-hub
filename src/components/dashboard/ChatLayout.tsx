'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  MessageCircle, 
  Users, 
  Clock, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  ArrowLeft,
  Send
} from 'lucide-react'

interface Message {
  id: string
  content: string
  senderType: string
  senderName: string
  createdAt: Date
  isApproved?: boolean | null
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

interface Stats {
  totalConversations: number
  activeConversations: number
  pendingResponses: number
  totalAccounts: number
}

interface DashboardData {
  conversations: Conversation[]
  stats: Stats
}

interface ChatLayoutProps {
  initialData: DashboardData
  selectedConversationId?: string
  selectedConversation?: any
}

export function ChatLayout({ 
  initialData, 
  selectedConversationId,
  selectedConversation 
}: ChatLayoutProps) {
  const router = useRouter()
  const [data, setData] = useState<DashboardData>(initialData)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Auto-refresh functionality
  useEffect(() => {
    console.log('🔄 Setting up chat layout auto-refresh...')
    
    const refreshData = async () => {
      try {
        const response = await fetch('/api/dashboard/conversations')
        if (response.ok) {
          const newData = await response.json()
          setData(newData)
          setLastUpdate(new Date())
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        console.error('❌ Error refreshing chat data:', error)
        setIsConnected(false)
      }
    }

    // Refresh every 8 seconds
    const interval = setInterval(refreshData, 8000)
    setIsConnected(true)
    
    return () => {
      clearInterval(interval)
      setIsConnected(false)
    }
  }, [])

  // Filter conversations based on search
  const filteredConversations = data.conversations.filter(conversation => {
    const clientName = conversation.clientName || conversation.clientEmail || 'Anonymous'
    const accountName = conversation.chatraAccount.name
    const lastMessage = conversation.messages[0]?.content || ''
    
    return (
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/dashboard/conversations')
      if (response.ok) {
        const newData = await response.json()
        setData(newData)
        setLastUpdate(new Date())
        setIsConnected(true)
        router.refresh()
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('❌ Error manually refreshing:', error)
      setIsConnected(false)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversation List */}
      <div className={`
        ${isMobileMenuOpen ? 'block' : 'hidden'} 
        lg:block lg:w-1/3 xl:w-1/4 
        bg-white border-r border-gray-200 flex flex-col
        fixed lg:relative inset-y-0 left-0 z-40 w-80
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Live Updates</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
            <span className="text-gray-500">
              {lastUpdate.toLocaleTimeString()}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-semibold text-blue-600">{data.stats.totalConversations}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-semibold text-green-600">{data.stats.activeConversations}</div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No conversations found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">Try adjusting your search</p>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const lastMessage = conversation.messages[0]
                const clientDisplay = conversation.clientName || conversation.clientEmail || 'Anonymous'
                const isSelected = selectedConversationId === conversation.id
                
                return (
                  <Link
                    key={conversation.id}
                    href={`/dashboard/conversation/${conversation.id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className={`
                      p-3 rounded-lg mb-1 cursor-pointer transition-colors
                      ${isSelected 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                      }
                    `}>
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {clientDisplay.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {clientDisplay}
                            </h4>
                            {conversation.lastMessageAt && (
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(conversation.lastMessageAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <Badge 
                                variant={conversation.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs px-1.5 py-0.5"
                              >
                                {conversation.status}
                              </Badge>
                              <span className="text-xs text-gray-500 truncate">
                                {conversation.chatraAccount.name}
                              </span>
                            </div>
                          </div>
                          
                          {lastMessage && (
                            <p className="text-xs text-gray-600 truncate mt-1">
                              {lastMessage.senderType === 'client' ? '👤' : 
                               lastMessage.senderType === 'llm' ? '🤖' : '👨‍💼'} {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center p-4 bg-white border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="mr-3"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(selectedConversation.clientName || selectedConversation.clientEmail || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-medium">
                    {selectedConversation.clientName || selectedConversation.clientEmail || 'Anonymous'}
                  </h2>
                  <p className="text-xs text-gray-500">{selectedConversation.chatraAccount?.name}</p>
                </div>
              </div>
            </div>
            
            {/* Conversation Content */}
            <div className="flex-1">
              {/* This would be replaced by ConversationView */}
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Conversation view will be loaded here</p>
                  <p className="text-sm mt-2">Selected: {selectedConversation.clientName || 'Anonymous'}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              {/* Mobile Menu Button */}
              <div className="lg:hidden mb-6">
                <Button
                  variant="outline"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>View Conversations</span>
                </Button>
              </div>
              
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  AI Chat Hub
                </h2>
                <p className="text-gray-600">
                  Select a conversation from the sidebar to start chatting with your customers
                </p>
              </div>
              
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{data.stats.totalConversations} total conversations</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{data.stats.pendingResponses} pending responses</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  {isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Live updates active</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Connection lost</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 