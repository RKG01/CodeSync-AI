<p align="center">
  <h1 align="center">⚡ CodeSync AI</h1>
  <p align="center">
    <strong>Real-Time Collaborative Code Editor with AI-Powered Debugging</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Monaco-Editor-007ACC?style=flat-square&logo=visual-studio-code" alt="Monaco" />
    <img src="https://img.shields.io/badge/Yjs-CRDT-FF6B6B?style=flat-square" alt="Yjs" />
    <img src="https://img.shields.io/badge/OpenAI-GPT--4-412991?style=flat-square&logo=openai" alt="OpenAI" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis" alt="Redis" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" alt="Docker" />
  </p>
</p>

---

## ✨ Features

- 🔄 **Real-Time Collaboration** — Multiple users edit simultaneously with conflict-free sync via CRDTs (Yjs)
- 🤖 **AI-Powered Debugging** — Integrated AI assistant detects bugs, explains code, and suggests fixes
- 👥 **Live Presence** — See collaborators' cursors, selections, and activity in real-time
- 📁 **Virtual File System** — Create, manage, and organize files with a VS Code-like file explorer
- 💬 **In-Editor Chat** — Communicate with collaborators without leaving the editor
- 🎨 **Multi-Language Support** — Syntax highlighting for 20+ programming languages
- 🔐 **Role-Based Access** — Owner, Editor, and Viewer roles for project collaboration
- 🌙 **Premium Dark Theme** — Stunning glassmorphism UI with smooth animations

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React +   │────▶│  Node.js/Express │────▶│ PostgreSQL  │
│   Monaco    │     │     REST API     │     │  Database   │
│   Editor    │     └──────────────────┘     └─────────────┘
│             │     ┌──────────────────┐     ┌─────────────┐
│   Yjs CRDT  │◀──▶│  Yjs WebSocket   │────▶│   Redis     │
│   Client    │     │    Server        │     │   Cache     │
└─────────────┘     └──────────────────┘     └─────────────┘
                    ┌──────────────────┐
                    │  OpenAI GPT-4    │
                    │   AI Service     │
                    └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** and npm
- **Docker** and Docker Compose (for PostgreSQL & Redis)
- **OpenAI API Key** (for AI features)

### 1. Clone & Configure

```bash
git clone https://github.com/yourusername/codesync-ai.git
cd codesync-ai

# Copy environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Start with Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, Server, Client)
docker-compose up -d

# The app will be available at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Yjs WS:   ws://localhost:1234
```

### 3. Start without Docker (Development)

```bash
# Terminal 1: Start PostgreSQL and Redis (requires local installation)
# Or start just the databases with Docker:
docker-compose up -d postgres redis

# Terminal 2: Start the backend
cd server
npm install
npm run dev

# Terminal 3: Start the frontend
cd client
npm install
npm run dev
```

---

## 📁 Project Structure

```
Code_collab/
├── client/                  # React Frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI Components
│   │   │   ├── AI/          # AI assistant panel
│   │   │   ├── Auth/        # Login, Signup, AuthGuard
│   │   │   ├── Collaboration/ # Chat, Presence, Share
│   │   │   ├── Dashboard/   # Project dashboard
│   │   │   ├── Editor/      # Monaco editor, tabs, cursors
│   │   │   ├── FileExplorer/ # File tree, create modal
│   │   │   └── Layout/      # Navbar, Sidebar, StatusBar
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks (Yjs, Auth, AI)
│   │   ├── services/        # API & WebSocket clients
│   │   └── utils/           # Helpers, themes, config
│   └── package.json
│
├── server/                  # Node.js Backend (Express)
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, rate limiting, errors
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # AI, context, presence
│   │   └── websocket/       # Yjs provider, chat
│   ├── migrations/          # SQL migrations
│   └── package.json
│
├── docker-compose.yml       # Full stack Docker setup
├── nginx.conf               # Production reverse proxy
└── .env.example             # Environment variables template
```

---

## 🔌 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/invite` | Invite collaborator |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/files` | Get file tree |
| POST | `/api/projects/:id/files` | Create file/folder |
| GET | `/api/files/:fileId` | Get file content |
| PUT | `/api/files/:fileId` | Update file |
| DELETE | `/api/files/:fileId` | Delete file |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/debug` | Debug code and get fix suggestions |
| POST | `/api/ai/explain` | Explain selected code |
| POST | `/api/ai/suggest` | Get code suggestions |
| POST | `/api/ai/chat` | Chat with AI about code |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Monaco Editor |
| Real-Time Sync | Yjs (CRDT), WebSocket |
| Backend | Node.js, Express |
| AI | OpenAI GPT-4 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | Nginx |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Built with ❤️ using React, Node.js, Yjs, and OpenAI
</p>
