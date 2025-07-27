import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

export default async function Home() {
  const session = await getServerSession(authOptions)

  // If user is authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // Check if there are any users in the system
  const userCount = await db.user.count()
  const isFirstUser = userCount === 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to AI Chat Hub
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isFirstUser 
              ? "Get started by creating your admin account"
              : "Centralized chat management with AI-powered responses"
            }
          </p>
        </div>

        <div className="space-y-4">
          {isFirstUser ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      First Time Setup
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Create your admin account to get started with AI Chat Hub.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Link 
                href="/auth/signup"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Admin Account
              </Link>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                      🤖 RAG-Powered AI Responses
                    </h3>
                    <p className="text-sm text-gray-600">
                      Generate intelligent responses using context from historical conversations
                    </p>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                      💬 Multi-Account Management
                    </h3>
                    <p className="text-sm text-gray-600">
                      Manage conversations from multiple Chatra accounts in one dashboard
                    </p>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                      👥 Human-in-the-Loop
                    </h3>
                    <p className="text-sm text-gray-600">
                      Review and approve AI-generated responses before sending
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link 
                  href="/auth/signin"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In
                </Link>
                
                <Link 
                  href="/auth/signup"
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
