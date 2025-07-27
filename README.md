# AI Chat Hub - Centralized Chat Management with RAG

A full-stack web application that acts as a custom, centralized dashboard for managing Chatra Live Chat conversations across multiple accounts, with integrated LLM-powered auto-responses grounded in a RAG (Retrieval Augmented Generation) system using historical client conversations.

## 🚀 Features

- **Multi-Account Chat Management**: Manage conversations from multiple Chatra accounts in a unified dashboard
- **RAG-Powered AI Responses**: Generate intelligent responses using Gemini 2.5 Flash-Lite with context from historical conversations
- **Real-time Webhooks**: Receive and process live chat events from Chatra
- **Human-in-the-Loop**: Review and approve AI-generated responses before sending
- **Vector Search**: Semantic search through historical conversations using pgvector
- **Modern UI**: Clean, responsive interface built with Next.js 15 and Shadcn UI

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 15+ (React), Shadcn UI, Tailwind CSS
- **Backend**: Next.js Server Actions, Node.js runtime
- **Database**: PostgreSQL with pgvector extension
- **ORM**: Prisma
- **Authentication**: NextAuth.js with credentials provider
- **LLM**: Google Gemini 2.5 Flash-Lite
- **Embeddings**: Google text-embedding-004
- **Chat Platform**: Chatra Live Chat

### System Components

```mermaid
graph TB
    A[Chatra Webhooks] --> B[Webhook Handler]
    B --> C[Message Processing]
    C --> D[RAG Pipeline]
    D --> E[Vector Search]
    E --> F[LLM Response Generation]
    F --> G[Dashboard UI]
    G --> H[Human Approval]
    H --> I[Chatra API]
    
    J[Knowledge Base] --> E
    K[Historical Data] --> J
```

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database with pgvector extension
- Google AI API key (for Gemini and embeddings)
- Chatra account(s) with API access

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ai-chat-hub
npm install
```

### 2. Environment Configuration

Copy the environment template:

```bash
cp env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/ai_chat_hub?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# Google AI Configuration
GOOGLE_AI_API_KEY="your-google-ai-api-key-here"
GOOGLE_EMBEDDING_API_KEY="your-google-embedding-api-key-here"

# Chatra Integration
CHATRA_WEBHOOK_SECRET="your-chatra-webhook-verification-secret"

# Development Environment
NODE_ENV="development"
```

### 3. Database Setup

#### Enable pgvector Extension

Connect to your PostgreSQL database and enable the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Run Database Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Create Initial Admin User

Create a simple script or use the built-in function to create your first admin user:

```bash
# You can create a simple Node.js script or use the createDemoUser function
# Example: Create admin@example.com with password "admin123"
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔌 Chatra Integration Setup

### 1. Configure Chatra Account

1. Log in to your Chatra dashboard
2. Go to Settings > API & Webhooks
3. Generate an API key
4. Set up webhook URL: `https://your-domain.com/api/chatra-webhook`
5. Configure webhook events: `message.created`, `conversation.created`, `conversation.updated`

### 2. Add Chatra Account to Database

Use the admin interface or directly insert into the database:

```sql
INSERT INTO chatra_accounts (name, chatra_id, api_key, webhook_secret, is_active)
VALUES ('My Chatra Account', 'your-chatra-id', 'your-api-key', 'webhook-secret', true);
```

## 📚 Knowledge Base & RAG Setup

### Overview

The RAG system requires a populated knowledge base to provide relevant context for LLM responses. This is achieved through a separate ingestion pipeline that processes historical conversation data.

### Data Ingestion Pipeline

**⚠️ IMPORTANT**: The knowledge base must be populated before the RAG system can provide meaningful responses. The main Next.js application expects the `knowledge_base` table to contain embedded conversation data.

### Ingestion Methods

#### Method 1: Chatra API Extraction (Recommended)

Create a separate script to extract historical conversations:

```javascript
// scripts/ingest-chatra-data.js
const { PrismaClient } = require('@prisma/client')
const { generateEmbedding } = require('../src/lib/llm')

async function ingestChatraConversations() {
  // 1. Fetch conversations from Chatra API
  // 2. Process and chunk the conversation data
  // 3. Generate embeddings for each chunk
  // 4. Store in knowledge_base table
}
```

#### Method 2: Email-Based Extraction

For archived conversations in email:

```javascript
// scripts/ingest-email-data.js
// Use IMAP to connect to email server
// Parse conversation transcripts from emails
// Process and embed the data
```

### Ingestion Script Example

```javascript
async function processConversationChunk(content, source, sourceId, metadata) {
  // Generate embedding
  const embedding = await generateEmbedding(content)
  
  // Store in database
  await prisma.knowledgeBase.create({
    data: {
      content,
      source,
      sourceId,
      metadata,
      embedding: `[${embedding.join(',')}]` // pgvector format
    }
  })
}
```

### Chunking Strategy

- **Individual Messages**: Each message as a separate chunk
- **Q&A Pairs**: Customer question + agent response pairs
- **Conversation Summaries**: Brief summaries of full conversations
- **Topic-Based**: Group related messages by topic/intent

## 🎯 Usage

### Dashboard Features

1. **Conversation List**: View all active conversations across Chatra accounts
2. **Individual Chat View**: Detailed conversation with message history
3. **AI Response Preview**: Review generated responses before sending
4. **Approval Workflow**: Approve or reject AI suggestions
5. **Manual Override**: Send custom agent responses

### RAG Pipeline Flow

1. **New Message Arrives**: Chatra webhook triggers processing
2. **Context Retrieval**: Vector search finds relevant historical conversations
3. **Prompt Augmentation**: Combines current context with retrieved knowledge
4. **LLM Generation**: Gemini 2.5 Flash-Lite generates response
5. **Human Review**: Agent reviews and approves/rejects response
6. **Response Delivery**: Approved responses sent via Chatra API

## 🔧 Development

### Project Structure

```
ai-chat-hub/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── conversation/      # Conversation components
│   │   └── ui/               # Shadcn UI components
│   └── lib/                   # Utility libraries
│       ├── auth.ts           # NextAuth configuration
│       ├── chatra.ts         # Chatra API integration
│       ├── db.ts             # Database client
│       └── llm.ts            # LLM and RAG functions
├── prisma/
│   └── schema.prisma         # Database schema
└── scripts/                  # Ingestion and utility scripts
```

### Key Components

- **Webhook Handler** (`/api/chatra-webhook`): Processes incoming Chatra events
- **RAG Pipeline** (`lib/llm.ts`): Handles embedding generation and context retrieval
- **Dashboard** (`app/dashboard`): Main conversation management interface
- **ConversationView**: Detailed chat interface with AI response management

### Database Schema

- **Users**: Agent authentication and roles
- **ChatraAccounts**: Multiple Chatra account configurations
- **Conversations**: Chat sessions with metadata
- **Messages**: Individual messages with sender info and approval status
- **KnowledgeBase**: Embedded historical conversation chunks

## 🚨 Important Considerations

### Security

- Validate all webhook signatures
- Protect API keys and database credentials
- Implement proper authentication and authorization
- Sanitize user inputs

### Scalability

- Monitor database query performance
- Implement rate limiting for external API calls
- Consider caching for frequently accessed data
- Plan for horizontal scaling if needed

### Data Privacy

- Handle sensitive conversation data responsibly
- Implement data retention policies
- Consider GDPR/privacy compliance requirements
- Secure vector embeddings and knowledge base

## 🐛 Troubleshooting

### Common Issues

1. **pgvector Extension**: Ensure PostgreSQL has pgvector extension installed
2. **API Rate Limits**: Monitor Google AI API and Chatra API usage
3. **Webhook Failures**: Check webhook URL accessibility and signature validation
4. **Empty Knowledge Base**: Ensure ingestion pipeline has run successfully

### Debugging

- Check server logs for webhook processing errors
- Monitor database connection and query performance
- Verify API key configurations
- Test embedding generation with sample data

## 📈 Future Enhancements

- **Multi-language Support**: Expand to support multiple languages
- **Advanced Analytics**: Conversation metrics and AI performance tracking
- **Custom Models**: Support for additional LLM providers
- **Automated Training**: Continuous learning from approved responses
- **Mobile App**: Mobile interface for agents
- **Integration Hub**: Support for additional chat platforms

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the GitHub issues
- Contact the development team

---

**Note**: This system requires the separate ingestion pipeline to be run before the RAG functionality can provide meaningful responses. The knowledge base population is crucial for the system's effectiveness.
