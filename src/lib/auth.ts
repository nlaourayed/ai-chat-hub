import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'
import bcrypt from 'bcryptjs'
import type { Adapter } from 'next-auth/adapters'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔍 NextAuth authorize called with:', { 
          email: credentials?.email,
          hasPassword: !!credentials?.password 
        })

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          console.log('❌ User not found:', credentials.email)
          return null
        }

        console.log('✅ User found:', { id: user.id, email: user.email })

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        console.log('🔐 Password comparison result:', isValidPassword)

        if (!isValidPassword) {
          console.log('❌ Invalid password')
          return null
        }

        const returnUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }

        console.log('✅ Returning user:', returnUser)
        return returnUser
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('🔗 JWT callback called:', { 
        hasUser: !!user, 
        tokenSub: token.sub,
        userRole: user?.role 
      })
      if (user) {
        token.role = user.role
        console.log('✅ Added role to token:', user.role)
      }
      return token
    },
    async session({ session, token }) {
      console.log('📝 Session callback called:', { 
        tokenSub: token.sub,
        tokenRole: token.role,
        sessionUserEmail: session.user?.email 
      })
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        console.log('✅ Session updated with:', { id: session.user.id, role: session.user.role })
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}

declare module 'next-auth' {
  interface User {
    role: string
  }
  
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
  }
} 