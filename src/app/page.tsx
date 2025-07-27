import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">
            AI Chat Hub
          </CardTitle>
          <CardDescription className="text-lg">
            Centralized Chat Management with RAG-Powered AI Responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Manage multiple Chatra chat accounts from a single dashboard with 
              intelligent AI responses powered by Gemini 2.5 Flash-Lite and 
              Retrieval Augmented Generation.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">🤖</span>
                <span>AI-Powered Responses</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">📚</span>
                <span>RAG Knowledge Base</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-purple-600">💬</span>
                <span>Multi-Account Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-orange-600">⚡</span>
                <span>Real-time Webhooks</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <Link href="/auth/signin">
              <Button className="w-full" size="lg">
                Sign In to Dashboard
              </Button>
            </Link>
            
            <div className="text-center text-sm text-gray-500">
              <p>
                New setup? Check the{' '}
                <Link href="#setup" className="text-blue-600 hover:underline">
                  README
                </Link>{' '}
                for configuration instructions.
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-2">Quick Setup:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Configure your database and environment variables</li>
              <li>Run database migrations</li>
              <li>Create your first admin user</li>
              <li>Add your Chatra account credentials</li>
              <li>Set up webhook endpoints</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
