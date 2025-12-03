# Free Prototype Setup Guide

This guide focuses on building a **zero-cost prototype** (except AI API usage) using free tiers and open-source tools.

---

## Cost Breakdown

### Completely Free (Forever)
- ✅ **Supabase Free Tier**: 500MB database, 1GB file storage, 50,000 monthly active users
- ✅ **Railway Free Trial**: $5 credit (enough for initial testing)
- ✅ **Render Free Tier**: 750 hours/month (enough for one service)
- ✅ **Fly.io Free Tier**: 3 shared VMs
- ✅ **Local Development**: Docker + PostgreSQL (completely free)

### Pay-Per-Use (Only What You Use)
- 💰 **OpenAI API**:
  - GPT-4o: $2.50 per 1M input tokens, $10 per 1M output tokens
  - GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
  - Whisper: $0.006 per minute of audio
- 💰 **Alternative - Deepgram**: $0.0043 per minute (cheaper than Whisper)

### Recommended Free Stack
```
Frontend: Vercel (free hosting)
Backend: Render free tier OR local with ngrok
Database: Supabase (free tier)
Auth: Supabase Auth (free)
Storage: Supabase Storage (free)
AI: OpenAI API (pay per use)
Transcription: OpenAI Whisper (pay per use)
```

---

## Supabase Free Tier (Yes, It's Free!)

### What You Get Free Forever
- **PostgreSQL Database**: 500MB storage
- **Authentication**: Unlimited users
- **Storage**: 1GB file storage
- **Realtime**: Unlimited connections
- **Edge Functions**: 500K invocations/month
- **Bandwidth**: 2GB/month

### What This Means for Your App
- Database: Can store thousands of projects/users
- Auth: Built-in JWT authentication (no coding needed!)
- Storage: Perfect for uploaded audio files
- **No credit card required** for free tier

---

## Setup Guide: Supabase + OpenAI

### Step 1: Create Supabase Project

```bash
# 1. Go to https://supabase.com
# 2. Sign up (free, no credit card)
# 3. Create new project
# 4. Wait 2 minutes for provisioning
# 5. Get your credentials:
#    - Project URL
#    - Project API Key (anon/public)
#    - Project API Key (service_role/secret)
```

### Step 2: Update Database Schema

Supabase provides a PostgreSQL database. Use their SQL Editor:

```sql
-- Run this in Supabase SQL Editor

-- Users table (Supabase Auth handles this automatically)
-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own projects
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 4: Configure Supabase in Backend

Replace Prisma with Supabase client:

**`src/config/supabase.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_KEY; // Use service key for backend

export const supabase = createClient(supabaseUrl, supabaseKey);

// For operations on behalf of users, create client with their token
export const createUserClient = (userToken: string) => {
  return createClient(supabaseUrl, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  });
};
```

### Step 5: Update Environment Variables

**`.env`:**

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase (from your Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Optional: Instagram (no cost)
# Only if you want Instagram support
```

---

## Simplified Auth with Supabase

No need to implement JWT manually! Supabase handles everything:

**`src/services/auth.service.ts`:**

```typescript
import { supabase } from '../config/supabase.js';

export const signup = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;

  return {
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name: data.user!.user_metadata.name,
      avatar: data.user!.user_metadata.avatar_url,
    },
    accessToken: data.session!.access_token,
    refreshToken: data.session!.refresh_token,
  };
};

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return {
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name: data.user!.user_metadata.name,
      avatar: data.user!.user_metadata.avatar_url,
    },
    accessToken: data.session!.access_token,
    refreshToken: data.session!.refresh_token,
  };
};

export const googleAuth = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
};
```

**`src/middleware/auth.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      userId: user.id,
      email: user.email!,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
```

---

## OpenAI Integration (Instead of Gemini)

### Update Gemini Service to OpenAI

**`src/services/openai.service.ts`:**

```typescript
import OpenAI from 'openai';
import { env } from '../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ContextSource {
  type: string;
  title?: string;
  content: string;
}

export const generateChatResponse = async (
  currentMessage: string,
  history: { role: 'user' | 'model'; text: string }[],
  contextSources: ContextSource[],
  userSystemInstruction?: string
): Promise<string> => {
  // Build context block
  const contextBlock = contextSources
    .map((source, index) => {
      return `--- SOURCE ${index + 1} (${source.type.toUpperCase()}: ${source.title || 'Untitled'}) ---\n${source.content}\n----------------------------------`;
    })
    .join('\n\n');

  // System message with context
  const systemMessage = `You are an AI assistant in a node-based workflow app.
Use the provided CONTEXT SOURCES to answer the user's query.

${userSystemInstruction ? `USER DEFINED ROLE/INSTRUCTION: ${userSystemInstruction}` : ''}

CONTEXT SOURCES:
${contextBlock}`;

  // Convert history to OpenAI format
  const messages: Message[] = [
    { role: 'system', content: systemMessage },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
      content: msg.text,
    })),
    { role: 'user', content: currentMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model: $0.15/1M input tokens
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || 'No response generated';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate response');
  }
};

// Export for transcription service
export { openai };
```

**Update `src/services/transcription.service.ts`:**

```typescript
import { openai } from './openai.service.js';
import { createReadStream } from 'fs';

export const transcribeAudioFile = async (filePath: string): Promise<string> => {
  try {
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
    });

    return response.text;
  } catch (error) {
    throw new Error(`Whisper API error: ${error}`);
  }
};
```

**Update `src/controllers/chat.controller.ts`:**

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as openaiService from '../services/openai.service.js';

export const chatCompletionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { message, history, contextSources, systemInstruction } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await openaiService.generateChatResponse(
      message,
      history || [],
      contextSources || [],
      systemInstruction
    );

    return res.json({ response });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Chat completion failed' });
  }
};
```

### Install OpenAI SDK

```bash
npm install openai
```

### Update Dependencies

**Remove:**
```bash
npm uninstall @google/generative-ai
npm uninstall @prisma/client prisma
npm uninstall bcrypt @types/bcrypt
npm uninstall jsonwebtoken @types/jsonwebtoken
```

**Add:**
```bash
npm install openai
npm install @supabase/supabase-js
```

---

## Simplified Project Service with Supabase

**`src/services/project.service.ts`:**

```typescript
import { supabase } from '../config/supabase.js';

export const getProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getProject = async (projectId: string, userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project not found');

  return data;
};

export const createProject = async (userId: string, name: string) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      nodes: [],
      edges: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProject = async (
  projectId: string,
  userId: string,
  updates: { name?: string; nodes?: any; edges?: any }
) => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project not found');

  return data;
};

export const deleteProject = async (projectId: string, userId: string) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
};
```

---

## Cost Optimization Tips

### 1. Use GPT-4o-mini Instead of GPT-4o
```typescript
model: 'gpt-4o-mini', // 94% cheaper than GPT-4o
```

**Cost Comparison:**
- GPT-4o: $2.50/1M input tokens
- GPT-4o-mini: $0.15/1M input tokens (16x cheaper!)

### 2. Limit Context Size
```typescript
// Only send relevant context to reduce token usage
const limitedContext = contextSources.slice(0, 3); // Max 3 sources
```

### 3. Implement Caching
```typescript
// Cache transcriptions to avoid re-transcribing
const transcriptionCache = new Map<string, string>();

export const transcribeAudioFile = async (filePath: string): Promise<string> => {
  const fileHash = await calculateFileHash(filePath);

  if (transcriptionCache.has(fileHash)) {
    return transcriptionCache.get(fileHash)!;
  }

  const result = await openai.audio.transcriptions.create({
    file: createReadStream(filePath),
    model: 'whisper-1',
  });

  transcriptionCache.set(fileHash, result.text);
  return result.text;
};
```

### 4. Use Supabase Storage (Free 1GB)
```typescript
import { supabase } from '../config/supabase.js';

export const uploadAudio = async (filePath: string, fileName: string) => {
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, createReadStream(filePath));

  if (error) throw error;
  return data;
};
```

---

## Free Deployment Options

### Option 1: Render (Recommended for Prototype)

**Pros:**
- 750 free hours/month
- Auto-deploy from GitHub
- Built-in PostgreSQL (if you don't use Supabase)

**Setup:**
1. Push code to GitHub
2. Connect Render to your repo
3. Add environment variables
4. Deploy (takes 5 minutes)

**Free Tier Limitations:**
- Spins down after 15 minutes of inactivity
- Takes ~30 seconds to wake up

### Option 2: Railway (Great for Development)

**Pros:**
- $5 free credit
- No credit card required initially
- Fast deployments

**Free Tier:**
- Good for 2-3 weeks of testing
- After credit runs out, need to upgrade

### Option 3: Fly.io (Best Performance)

**Pros:**
- 3 free VMs (256MB RAM each)
- Great performance
- Low cold start times

**Setup:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch

# Set secrets
fly secrets set OPENAI_API_KEY=sk-xxx
fly secrets set SUPABASE_URL=https://xxx.supabase.co
```

### Option 4: Local + Ngrok (For Development)

**Completely Free:**
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Expose to internet
npx ngrok http 3001

# Use ngrok URL in frontend
```

---

## Updated Environment Variables (Minimal)

**`.env`:**

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase (all free tier)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# OpenAI (pay per use)
OPENAI_API_KEY=sk-xxx

# Optional: Only for Instagram support
# Leave blank if not using Instagram
```

---

## Estimated Monthly Costs (Typical Usage)

### Development/Testing (50 requests)
- Chat API: ~$0.02 (using GPT-4o-mini)
- Transcription: ~$0.05 (5 minutes of audio)
- **Total: ~$0.07/month**

### Light Usage (500 requests)
- Chat API: ~$0.20
- Transcription: ~$0.50 (50 minutes of audio)
- **Total: ~$0.70/month**

### Medium Usage (5000 requests)
- Chat API: ~$2.00
- Transcription: ~$5.00 (500 minutes of audio)
- **Total: ~$7.00/month**

**Everything else is FREE with Supabase free tier!**

---

## Quick Start Commands

```bash
# 1. Clone/create project
mkdir server && cd server

# 2. Initialize
npm init -y

# 3. Install minimal dependencies
npm install express cors dotenv
npm install @supabase/supabase-js openai
npm install axios cheerio puppeteer
npm install @distube/ytdl-core multer

# 4. Install dev dependencies
npm install -D typescript @types/node @types/express
npm install -D @types/cors @types/multer tsx nodemon

# 5. Set up Supabase (web UI)
# - Go to supabase.com
# - Create project
# - Run SQL schema from above

# 6. Create .env file
# - Add Supabase credentials
# - Add OpenAI API key

# 7. Start development
npm run dev
```

---

## Comparison: Before vs After

### Before (Original Guide)
- Prisma + PostgreSQL (need to manage yourself)
- JWT implementation from scratch
- Gemini AI (need Google Cloud account)
- Manual password hashing with bcrypt
- Complex auth setup
- Need Redis for sessions

### After (Free Prototype)
- Supabase (managed PostgreSQL + Auth)
- Built-in JWT (handled by Supabase)
- OpenAI (you already have access)
- Supabase handles password hashing
- 5-minute auth setup
- No Redis needed

**Lines of Code Saved: ~500 lines**

---

## Next Steps

1. ✅ Sign up for Supabase (free)
2. ✅ Create project in Supabase
3. ✅ Run SQL schema
4. ✅ Get API keys
5. ✅ Update backend code
6. ✅ Deploy to Render (free)
7. ✅ Connect frontend
8. ✅ Test with real data

**Total setup time: ~30 minutes**
**Total cost: $0 + OpenAI usage**

---

## Troubleshooting

### "Supabase connection failed"
- Check your SUPABASE_URL and keys
- Make sure project is not paused (free tier pauses after 7 days of inactivity)

### "OpenAI rate limit"
- Free tier: 3 requests/minute
- Add delays between requests
- Or upgrade to pay-as-you-go (no minimum)

### "Render service sleeping"
- Free tier spins down after 15 min
- First request takes ~30 seconds
- Use paid tier ($7/month) for always-on

---

**You now have a production-ready backend that costs almost nothing to run!**
