'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { db } from './db'
import type { ApiResponse } from '@/types'

interface ChatraAccountData {
  name: string
  chatraId: string
  apiKey: string
  webhookSecret: string
  isActive: boolean
}

interface ChatraAccountUpdateData {
  name?: string
  chatraId?: string
  apiKey?: string
  webhookSecret?: string
  isActive?: boolean
}

/**
 * Add a new Chatra account
 */
export async function addChatraAccount(data: ChatraAccountData): Promise<ApiResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    // Check if account with this Chatra ID already exists
    const existingAccount = await db.chatraAccount.findUnique({
      where: { chatraId: data.chatraId }
    })

    if (existingAccount) {
      throw new Error('An account with this Chatra ID already exists')
    }

    const account = await db.chatraAccount.create({
      data: {
        name: data.name,
        chatraId: data.chatraId,
        apiKey: data.apiKey,
        webhookSecret: data.webhookSecret,
        isActive: data.isActive
      }
    })

    revalidatePath('/dashboard/chatra-accounts')
    return { success: true, data: account }
  } catch (error) {
    console.error('Error adding Chatra account:', error)
    throw error
  }
}

/**
 * Update an existing Chatra account
 */
export async function updateChatraAccount(id: string, data: ChatraAccountUpdateData): Promise<ApiResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const account = await db.chatraAccount.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    revalidatePath('/dashboard/chatra-accounts')
    return { success: true, data: account }
  } catch (error) {
    console.error('Error updating Chatra account:', error)
    throw error
  }
}

/**
 * Delete a Chatra account
 */
export async function deleteChatraAccount(id: string): Promise<ApiResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    await db.chatraAccount.delete({
      where: { id }
    })

    revalidatePath('/dashboard/chatra-accounts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting Chatra account:', error)
    throw error
  }
}

/**
 * Get all Chatra accounts for the current user
 */
export async function getChatraAccounts() {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const accounts = await db.chatraAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            conversations: true
          }
        }
      }
    })

    return accounts
  } catch (error) {
    console.error('Error fetching Chatra accounts:', error)
    throw error
  }
} 