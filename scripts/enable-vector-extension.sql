-- Enable the pgvector extension for similarity search
-- Run this in your Supabase SQL Editor

-- 1. Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 3. Test vector operations (should not error if extension is working)
SELECT '[1,2,3]'::vector <=> '[1,2,4]'::vector as distance;

-- 4. Check existing knowledge_base table structure
\d knowledge_base;

-- 5. If you need to recreate the embedding column as proper vector type:
-- (Only run this if you want to convert from text to vector type)
-- 
-- ALTER TABLE knowledge_base DROP COLUMN IF EXISTS embedding_vector;
-- ALTER TABLE knowledge_base ADD COLUMN embedding_vector vector(1536);
-- 
-- -- Convert existing text embeddings to vector type
-- UPDATE knowledge_base 
-- SET embedding_vector = embedding::vector 
-- WHERE embedding IS NOT NULL AND embedding != '';
-- 
-- -- Create index for faster similarity search
-- CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
-- ON knowledge_base USING ivfflat (embedding_vector vector_cosine_ops) 
-- WITH (lists = 100);

-- Check if everything is working
SELECT 
  id, 
  content, 
  CASE 
    WHEN embedding IS NOT NULL AND embedding != '' THEN 'Has embedding'
    ELSE 'No embedding'
  END as embedding_status
FROM knowledge_base 
LIMIT 5; 