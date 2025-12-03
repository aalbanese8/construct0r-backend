# Construct0r Backend

Backend server for Construct0r - A visual node-based workflow editor with AI integration.

## Features

- User authentication with Supabase
- Project management (save/load workflows)
- YouTube video transcription with OpenAI Whisper
- Instagram content extraction
- Web page scraping (with JavaScript support)
- AI chat with context using OpenAI GPT-4o-mini
- RESTful API with TypeScript and Express

## Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database & Auth:** Supabase (PostgreSQL + Auth)
- **AI:** OpenAI (GPT-4o-mini + Whisper)
- **Content Extraction:**
  - YouTube: ytdl-core
  - Instagram: Instaloader (Python)
  - Web: Cheerio + Puppeteer

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Python 3.8+ installed (for Instagram support)
- A Supabase account (free tier)
- An OpenAI API key

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for Instagram (optional)
pip3 install instaloader
```

### 2. Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project (wait 2 minutes for provisioning)
3. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

4. Go to **SQL Editor** and run this schema:

```sql
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

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

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

### 3. Get OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

Your `.env` should look like:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 6. Verify Installation

Open [http://localhost:3001/health](http://localhost:3001/health) - you should see:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API Endpoints

### Authentication

- `POST /auth/signup` - Create new account
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Google OAuth login

### Projects

- `GET /projects` - Get all user projects
- `GET /projects/:id` - Get specific project
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Content Extraction

- `POST /api/transcribe/youtube` - Transcribe YouTube video
- `POST /api/transcribe/audio` - Transcribe audio file
- `POST /api/extract/instagram` - Extract Instagram caption
- `POST /api/scrape` - Scrape web page

### AI Chat

- `POST /api/chat/completions` - Generate AI response with context

## Project Structure

```
construct0r-backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment configuration
│   │   └── supabase.ts         # Supabase client setup
│   ├── services/
│   │   ├── auth.service.ts     # Authentication logic
│   │   ├── project.service.ts  # Project CRUD operations
│   │   ├── openai.service.ts   # OpenAI chat integration
│   │   ├── transcription.service.ts  # YouTube transcription
│   │   ├── scraper.service.ts  # Web scraping
│   │   └── instagram.service.ts # Instagram extraction
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── project.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── transcription.controller.ts
│   │   └── scraper.controller.ts
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication
│   │   └── errorHandler.ts    # Error handling
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── project.routes.ts
│   │   └── api.routes.ts
│   └── index.ts                # Main server file
├── scripts/
│   └── instagram_downloader.py # Instagram content extractor
├── uploads/                    # Temporary file storage
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run typecheck` - Check TypeScript types

### Testing the API

You can test the API using curl or Postman:

```bash
# Health check
curl http://localhost:3001/health

# Sign up
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create project (requires auth token)
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name":"My First Project"}'
```

## Deployment

### Option 1: Render (Recommended - Free Tier)

1. Push your code to GitHub
2. Go to [https://render.com](https://render.com)
3. Create new Web Service
4. Connect your GitHub repository
5. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** Add all from `.env`
6. Deploy

Free tier limitations:
- Spins down after 15 minutes of inactivity
- Takes ~30 seconds to wake up

### Option 2: Railway

1. Push your code to GitHub
2. Go to [https://railway.app](https://railway.app)
3. Create new project from GitHub repo
4. Add environment variables
5. Deploy

Free tier: $5 credit (good for 2-3 weeks of testing)

### Option 3: Local with ngrok (Development)

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Expose to internet
npx ngrok http 3001

# Use ngrok URL in your frontend
```

## Cost Breakdown

### Free Forever
- Supabase free tier: 500MB database, unlimited auth
- Render/Railway: Free tier available

### Pay-Per-Use
- **OpenAI GPT-4o-mini:** $0.15 per 1M input tokens, $0.60 per 1M output tokens
- **OpenAI Whisper:** $0.006 per minute of audio

### Estimated Monthly Costs
- **Light usage (500 requests):** ~$0.70/month
- **Medium usage (5000 requests):** ~$7.00/month

## Troubleshooting

### "Supabase connection failed"
- Verify your `SUPABASE_URL` and keys in `.env`
- Check if your Supabase project is active (not paused)

### "OpenAI rate limit"
- Free tier: 3 requests/minute
- Upgrade to pay-as-you-go for higher limits

### "Instagram extraction failed"
- Ensure Python 3 is installed: `python3 --version`
- Install Instaloader: `pip3 install instaloader`
- Make script executable: `chmod +x scripts/instagram_downloader.py`

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

### Port already in use
- Change `PORT` in `.env` to a different port (e.g., 3002)
- Or kill the process using port 3001

## Security Notes

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- The `service_role` key should only be used on the backend
- Enable Supabase RLS (Row Level Security) policies
- Use HTTPS in production

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the Setup.md guide
3. Check Supabase and OpenAI documentation

## License

MIT