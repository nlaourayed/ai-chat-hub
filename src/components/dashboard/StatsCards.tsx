import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface StatsCardsProps {
  stats: {
    totalConversations: number
    activeConversations: number
    pendingResponses: number
    totalAccounts: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Conversations',
      value: stats.totalConversations,
      description: 'All conversations across accounts',
      color: 'text-blue-600'
    },
    {
      title: 'Active Conversations',
      value: stats.activeConversations,
      description: 'Currently ongoing chats',
      color: 'text-green-600'
    },
    {
      title: 'Pending AI Responses',
      value: stats.pendingResponses,
      description: 'Responses awaiting approval',
      color: 'text-orange-600'
    },
    {
      title: 'Connected Accounts',
      value: stats.totalAccounts,
      description: 'Active Chatra accounts',
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {card.description}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 