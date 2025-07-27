/**
 * Setup Script for AI Chat Hub
 * 
 * This script helps you get started by:
 * 1. Creating your first admin user
 * 2. Testing database connectivity
 * 3. Verifying environment configuration
 * 
 * Usage: node scripts/setup.js
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

async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function checkEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_AI_API_KEY'
  ]
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(varName => console.error(`   - ${varName}`))
    console.log('\nPlease set these in your .env.local file')
    return false
  }
  
  console.log('✅ Environment variables configured')
  return true
}

async function createAdminUser() {
  try {
    console.log('\n🔐 Setting up admin user...')
    
    const email = await question('Enter admin email: ')
    const name = await question('Enter admin name (optional): ')
    const password = await question('Enter admin password: ')
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log('⚠️  User with this email already exists')
      const overwrite = await question('Do you want to update the password? (y/N): ')
      
      if (overwrite.toLowerCase() !== 'y') {
        return existingUser
      }
      
      const hashedPassword = await bcrypt.hash(password, 12)
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          name: name || undefined
        }
      })
      
      console.log('✅ Admin user updated')
      return updatedUser
    } else {
      const hashedPassword = await bcrypt.hash(password, 12)
      const user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          password: hashedPassword,
          role: 'admin'
        }
      })
      
      console.log('✅ Admin user created')
      return user
    }
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message)
    throw error
  }
}

async function testGoogleAI() {
  try {
    console.log('\n🤖 Testing Google AI API...')
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: 'Hello, world!' }] }
        })
      }
    )
    
    if (response.ok) {
      console.log('✅ Google AI API working')
      return true
    } else {
      console.error('❌ Google AI API error:', response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Google AI API test failed:', error.message)
    return false
  }
}

async function checkPgVector() {
  try {
    console.log('\n🔍 Checking pgvector extension...')
    
    const result = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_vector;
    `
    
    if (result[0].has_vector) {
      console.log('✅ pgvector extension is installed')
      return true
    } else {
      console.error('❌ pgvector extension not found')
      console.log('Please run: CREATE EXTENSION IF NOT EXISTS vector; in your PostgreSQL database')
      return false
    }
  } catch (error) {
    console.error('❌ pgvector check failed:', error.message)
    return false
  }
}

async function createSampleChatraAccount() {
  try {
    console.log('\n📞 Setting up sample Chatra account...')
    
    const setupChatra = await question('Do you want to set up a Chatra account now? (y/N): ')
    
    if (setupChatra.toLowerCase() !== 'y') {
      console.log('ℹ️  You can add Chatra accounts later through the dashboard')
      return null
    }
    
    const name = await question('Enter Chatra account name: ')
    const chatraId = await question('Enter Chatra account ID: ')
    const apiKey = await question('Enter Chatra API key: ')
    const webhookSecret = await question('Enter webhook secret: ')
    
    const account = await prisma.chatraAccount.create({
      data: {
        name,
        chatraId,
        apiKey,
        webhookSecret,
        isActive: true
      }
    })
    
    console.log('✅ Chatra account configured')
    return account
  } catch (error) {
    console.error('❌ Failed to create Chatra account:', error.message)
    return null
  }
}

async function displayNextSteps() {
  console.log('\n🎉 Setup completed successfully!')
  console.log('\nNext steps:')
  console.log('1. Start the development server: npm run dev')
  console.log('2. Visit http://localhost:3000 and sign in with your admin account')
  console.log('3. Configure your Chatra webhook URL: http://localhost:3000/api/chatra-webhook')
  console.log('4. Run the sample ingestion script: node scripts/sample-ingestion.js')
  console.log('5. Test the system with some sample conversations')
  console.log('\n📖 Check the README.md for detailed documentation')
}

async function main() {
  try {
    console.log('🚀 AI Chat Hub Setup\n')
    
    // Check environment
    const envOk = await checkEnvironment()
    if (!envOk) {
      process.exit(1)
    }
    
    // Test database
    const dbOk = await testDatabaseConnection()
    if (!dbOk) {
      process.exit(1)
    }
    
    // Check pgvector
    await checkPgVector()
    
    // Test Google AI
    await testGoogleAI()
    
    // Create admin user
    await createAdminUser()
    
    // Optional: Create Chatra account
    await createSampleChatraAccount()
    
    // Show next steps
    await displayNextSteps()
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

if (require.main === module) {
  main()
}

module.exports = { createAdminUser, testDatabaseConnection } 