# Usability Testing Template 🧪

An open-source, self-hosted usability testing platform that lets you run unmoderated usability studies with screen recording, task flows, and AI-powered analysis.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-ff5e5b?logo=ko-fi)](https://ko-fi.com/yourusername)

## ✨ Features

- **Self-Paced Testing** - Participants complete tasks at their own pace
- **Screen Recording** - Capture participant screens during testing (optional)
- **Embedded Prototypes** - Display Figma or other prototype embeds directly in the test
- **Task-Based Flow** - Guide participants through structured goal-based tasks
- **Admin Dashboard** - View and analyze all participant responses
- **AI Analysis** - Optional OpenAI-powered insights and audio transcription
- **Privacy-First** - Self-hosted, no data leaves your infrastructure
- **Customizable** - Configure tasks, questions, and branding to match your needs

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/usability-testing-template.git
cd usability-testing-template
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required: Supabase credentials
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required: Admin dashboard password
VITE_ADMIN_PASSWORD=your-secure-password

# Optional: Prototype URL
VITE_PROTOTYPE_URL=https://embed.figma.com/proto/...

# Optional: OpenAI for AI analysis
OPENAI_API_KEY=your-openai-key
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your usability test.

## 📋 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_PROJECT_ID` | Yes | Your Supabase project ID |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_ADMIN_PASSWORD` | Yes | Password for admin dashboard |
| `VITE_PROTOTYPE_URL` | No | Figma/prototype embed URL |
| `VITE_TEST_TITLE` | No | Custom test title |
| `VITE_ENABLE_AI_ANALYSIS` | No | Enable AI features (default: true) |
| `VITE_ENABLE_SCREEN_RECORDING` | No | Enable recording (default: true) |
| `OPENAI_API_KEY` | No | For AI analysis and transcription |

### Setting Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API to find your credentials
4. Deploy the Edge Functions from `src/supabase/functions/`

See [SETUP.md](./SETUP.md) for detailed database configuration.

## 🎯 Customizing Tasks

Tasks are configured in `src/components/TaskFlow.tsx`. Each task includes:

- **Scenario** - Context for the participant
- **Questions** - Completion, difficulty rating, and feedback fields

To modify tasks, edit the `taskScenarios` and `tasks` arrays.

## 📊 Admin Dashboard

Access the admin dashboard at `?admin=true` with your configured password.

Features:
- View all participant responses
- Export data to CSV
- AI-generated analysis (requires OpenAI key)
- Filter and search participants
- View screen recordings

## 🔒 Security

- All credentials stored in environment variables (never committed)
- Admin access protected by password
- Data stored in your own Supabase instance
- No external analytics or tracking

## 🏗️ Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=build
```

### Self-Hosted

Build and serve the `build/` directory with any static file server.

## 💖 Support Development

If this template helped you, consider supporting continued development:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/yourusername)

## 📄 License

MIT License - feel free to use for commercial and personal projects.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

---

Built with React, Vite, Supabase, and Radix UI.