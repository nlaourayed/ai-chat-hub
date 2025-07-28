'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConversationList } from './ConversationList'
import { StatsCards } from './StatsCards'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
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

interface DashboardContentProps {
  initialData: DashboardData
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  const router = useRouter()
  const [data, setData] = useState<DashboardData>(initialData)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Auto-refresh functionality
  useEffect(() => {
    console.log('🔄 Setting up dashboard auto-refresh...')
    
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
        console.error('❌ Error refreshing dashboard data:', error)
        setIsConnected(false)
      }
    }

    // Refresh every 10 seconds
    const interval = setInterval(refreshData, 10000)
    
    // Mark as connected initially
    setIsConnected(true)
    
    return () => {
      console.log('🧹 Cleaning up dashboard auto-refresh')
      clearInterval(interval)
      setIsConnected(false)
    }
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/dashboard/conversations')
      if (response.ok) {
        const newData = await response.json()
        setData(newData)
        setLastUpdate(new Date())
        setIsConnected(true)
        
        // Also refresh the router cache for good measure
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
    <>
      {/* Auto-refresh Status Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your conversations across all Chatra accounts
            </p>
          </div>
          
          {/* Connection Status and Manual Refresh */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Auto-refresh Active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Auto-refresh Disconnected</span>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            
            <span className="text-xs text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <StatsCards stats={data.stats} />
      
      <div className="mt-8">
        <ConversationList conversations={data.conversations} />
      </div>
    </>
  )
} 