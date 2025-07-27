import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { KnowledgeBaseManager } from '@/components/knowledge-base/KnowledgeBaseManager'

export default async function KnowledgeBasePage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch knowledge base entries
  const knowledgeBaseEntries = await db.knowledgeBase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100 // Limit to recent entries for performance
  })

  // Get stats
  const stats = {
    totalEntries: await db.knowledgeBase.count(),
    sources: await db.knowledgeBase.groupBy({
      by: ['source'],
      _count: { source: true }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Knowledge Base Management
          </h1>
          <p className="text-gray-600">
            Manage your RAG knowledge base entries for AI-powered responses
          </p>
        </div>

        <KnowledgeBaseManager 
          entries={knowledgeBaseEntries}
          stats={stats}
        />
      </main>
    </div>
  )
} 