/**
 * Create User Script for AI Chat Hub
 * 
 * This script helps you create your first admin user account.
 * Usage: node scripts/create-user.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function createUser() {
  try {
    console.log('🔐 Create your first admin user for AI Chat Hub\n')
    
    const email = await question('Enter email address: ')
    const name = await question('Enter your name (optional): ')
    const password = await question('Enter password: ')
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log('❌ A user with this email already exists!')
      console.log('If you want to reset the password, you can update it directly in the database.')
      return
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        role: 'admin'
      }
    })
    
    console.log('\n✅ User created successfully!')
    console.log(`📧 Email: ${user.email}`)
    console.log(`👤 Name: ${user.name || 'Not provided'}`)
    console.log(`🔑 Role: ${user.role}`)
    console.log(`🆔 User ID: ${user.id}`)
    
    console.log('\n🎉 You can now sign in to your dashboard!')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Visit: http://localhost:3000')
    console.log('3. Click "Sign In to Dashboard"')
    console.log('4. Use the email and password you just created')
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

// Run the script
createUser() 